import { createHash } from "node:crypto";

// Planning only: the host owns execution, skill loading, and observed results.
export type ReviewRole = 'egm' | 'security-audit';
export type Surface = 'architecture' | 'security' | 'complexity';
export type WorkState = 'pending' | 'running' | 'passed' | 'failed';
export interface WorkTask {
  id: string;
  goal: string;
  dependsOn: readonly string[];
  writes: readonly string[];
  acceptance: readonly string[];
  preserves: readonly string[];
  surfaces: readonly Surface[];
}
export interface WorkResult {
  state: Exclude<WorkState, 'pending'>;
  attempt: number;
  evidence?: string;
}
export const reviewProfiles = {
  egm: { source: 'https://github.com/google/elephant-goldfish-model', focus: 'Compare WORK com STABLE: código, contratos, regressões e evidências faltantes.' },
  'security-audit': { source: 'https://github.com/cloudflare/security-audit-skill', focus: 'Fronteiras de confiança, entradas e permissões; diferencie hipótese de achado validado.' },
} as const;
export const programmerProfile = {
  role: 'ponytail', source: 'https://github.com/DietrichGebert/ponytail',
  focus: 'Implemente a menor solução que atende ao contrato, preservando testes e proteções.',
  access: 'work-only',
} as const;
const surfaces = new Set<Surface>(['architecture', 'security', 'complexity']);

function pathKey(file: string): string {
  const key = file.toLowerCase();
  if (!/^[a-z0-9._/-]+$/i.test(file) ||
      key.split('/').some(p => !p || p === '.' || p === '..' || p === '.git' || p.endsWith('.'))) {
    throw new Error('Invalid repository-relative write path: ' + file);
  }
  return key;
}
function overlaps(a: string, b: string): boolean {
  return a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
}

export function planWork(
  tasks: readonly WorkTask[],
  results: ReadonlyMap<string, WorkResult> = new Map(),
  maxAttempts = 2,
) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error('Invalid attempt limit');
  const byId = new Map<string, WorkTask>();
  const scopes = new Map<string, string[]>();
  for (const task of tasks) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(task.id) || byId.has(task.id)) throw new Error('Invalid or duplicate task ID');
    if (!task.goal.trim() || !task.acceptance.length ||
        [...task.acceptance, ...task.preserves].some(x => !x.trim())) throw new Error('Task needs a goal and acceptance criteria');
    if (task.surfaces.some(s => !surfaces.has(s))) throw new Error('Unknown review surface');
    byId.set(task.id, task);
    scopes.set(task.id, task.writes.map(pathKey));
  }
  const visiting = new Set<string>(), done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error('Dependency cycle at ' + id);
    if (done.has(id)) return;
    const task = byId.get(id);
    if (!task) throw new Error('Unknown dependency: ' + id);
    visiting.add(id);
    task.dependsOn.forEach(visit);
    visiting.delete(id); done.add(id);
  }
  tasks.forEach(task => visit(task.id));
  for (const [id, item] of results) {
    const task = byId.get(id);
    if (!task || !['running', 'failed', 'passed'].includes(item.state) ||
        !Number.isSafeInteger(item.attempt) || item.attempt < 1 || item.attempt > maxAttempts ||
        (item.state !== 'running' && !item.evidence?.trim())) throw new Error('Invalid result for ' + id);
    if (task.dependsOn.some(dep => results.get(dep)?.state !== 'passed')) throw new Error('Unmet dependency for ' + id);
  }
  const reserved: { id: string; path: string }[] = [];
  function holder(id: string) {
    return reserved.find(lock => scopes.get(id)!.some(p => overlaps(p, lock.path)));
  }
  function reserve(id: string) {
    for (const p of scopes.get(id)!) reserved.push({ id, path: p });
  }
  for (const [id, item] of results) {
    if (item.state !== 'running') continue;
    if (holder(id)) throw new Error('Overlapping writes already running');
    reserve(id);
  }
  const dispatch: { task: WorkTask; attempt: number; worker: typeof programmerProfile; previousFailure?: string }[] = [];
  const waiting: { id: string; reason: 'dependency' | 'write-conflict' | 'attempt-limit'; on: string[] }[] = [];
  for (const task of tasks) {
    const result = results.get(task.id);
    if (result?.state === 'passed' || result?.state === 'running') continue;
    if (result?.state === 'failed' && result.attempt >= maxAttempts) {
      waiting.push({ id: task.id, reason: 'attempt-limit', on: [] });
      continue;
    }
    const deps = task.dependsOn.filter(id => results.get(id)?.state !== 'passed');
    if (deps.length) {
      waiting.push({ id: task.id, reason: 'dependency', on: deps });
      continue;
    }
    const lock = holder(task.id);
    if (lock) {
      waiting.push({ id: task.id, reason: 'write-conflict', on: [lock.id] });
      continue;
    }
    reserve(task.id);
    dispatch.push({ task, worker: programmerProfile, attempt: (result?.attempt ?? 0) + 1,
      ...(result?.evidence === undefined ? {} : { previousFailure: result.evidence }) });
  }
  const roles: ReviewRole[] = tasks.length ? ['security-audit', 'egm'] : [];
  const reviews = roles.map(role => ({
    role, ...reviewProfiles[role], mode: 'fresh-session' as const, access: 'read-only' as const,
  }));
  return { dispatch, waiting, reviews, readyForReview: tasks.length > 0 &&
    tasks.every(task => results.get(task.id)?.state === 'passed') };
}

export interface CandidatePair { stableSha: string; workSha: string }
export interface SwarmOpinion extends CandidatePair {
  planHash: string;
  phase: ReviewPhase;
  role: ReviewRole;
  verdict: 'allow' | 'block';
  evidence: string;
}
export type ReviewPhase = 'security-before' | 'security-after' | 'egm-diff';
export interface SwarmReports {
  before?: SwarmOpinion;
  after?: SwarmOpinion;
  comparison?: SwarmOpinion;
}

/**
 * Advisory planning for one reviewed task plan. The host resolves Git identities,
 * supplies its observations, and enforces access; these are not Gate approvals.
 */
export function planSwarm(
  tasks: readonly WorkTask[],
  initial: CandidatePair,
  current: CandidatePair,
  reports: SwarmReports = {},
  results: ReadonlyMap<string, WorkResult> = new Map(),
  maxAttempts = 2,
) {
  for (const sha of [initial.stableSha, initial.workSha, current.stableSha, current.workSha]) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Expected full Git SHA');
  }
  const plan = planWork(tasks, results, maxAttempts);
  const planHash = createHash("sha256").update(JSON.stringify(tasks.map(t =>
    [t.id, t.goal, t.dependsOn, t.writes, t.acceptance, t.preserves, t.surfaces]))).digest("hex");
  function opinion(record: SwarmOpinion | undefined, pair: CandidatePair, phase: ReviewPhase, role: ReviewRole) {
    if (!record || record.phase !== phase || record.role !== role || record.planHash !== planHash || record.stableSha !== pair.stableSha || record.workSha !== pair.workSha) return 'missing';
    if (!record.evidence.trim() || !['allow', 'block'].includes(record.verdict)) throw new Error('Invalid review opinion');
    return record.verdict;
  }
  const waiting = (phase: ReviewPhase, role: ReviewRole, pair: CandidatePair, status: string) => ({
    phase, status, request: { phase, role, ...reviewProfiles[role], ...pair, planHash,
      mode: 'fresh-session' as const, access: 'read-only' as const },
    dispatch: [], readyForGate: false,
  });
  if (!tasks.length || initial.stableSha !== current.stableSha) {
    return { phase: 'blocked' as const, status: tasks.length ? 'stable-changed' : 'no-tasks', dispatch: [], readyForGate: false };
  }
  const before = opinion(reports.before, initial, 'security-before', 'security-audit');
  if (before !== 'allow') {
    return waiting('security-before', 'security-audit', initial, before);
  }
  if (!plan.readyForReview) {
    return { phase: 'implementation' as const, status: 'pending', dispatch: plan.dispatch,
      waiting: plan.waiting, readyForGate: false };
  }
  const after = opinion(reports.after, current, 'security-after', 'security-audit');
  if (after !== 'allow') return waiting('security-after', 'security-audit', current, after);
  const comparison = opinion(reports.comparison, current, 'egm-diff', 'egm');
  if (comparison !== 'allow') return waiting('egm-diff', 'egm', current, comparison);
  return { phase: 'gate' as const, status: 'checks-still-required', dispatch: [], readyForGate: true };
}
