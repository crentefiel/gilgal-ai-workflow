// Planning only: the host owns execution, skill loading, and observed results.
export type ReviewRole = 'egm' | 'security-audit' | 'ponytail';
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
  egm: { source: 'https://github.com/google/elephant-goldfish-model', focus: 'Arquitetura, contratos e divergência entre plano e código.' },
  'security-audit': { source: 'https://github.com/cloudflare/security-audit-skill', focus: 'Fronteiras de confiança, entradas e permissões; diferencie hipótese de achado validado.' },
  ponytail: { source: 'https://github.com/DietrichGebert/ponytail', focus: 'Solução mínima e reutilização, preservando validação, testes, segurança e acessibilidade.' },
} as const;
const routing: Record<Surface, ReviewRole> = {
  architecture: 'egm', security: 'security-audit', complexity: 'ponytail',
};

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
    if (task.surfaces.some(s => !Object.hasOwn(routing, s))) throw new Error('Unknown review surface');
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
  const dispatch: { task: WorkTask; attempt: number; previousFailure?: string }[] = [];
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
    dispatch.push({ task, attempt: (result?.attempt ?? 0) + 1,
      ...(result?.evidence === undefined ? {} : { previousFailure: result.evidence }) });
  }
  const reviews = [...new Set(tasks.flatMap(t => t.surfaces.map(s => routing[s])))].map(role => ({
    role, ...reviewProfiles[role], mode: 'fresh-session' as const, access: 'read-only' as const,
  }));
  return { dispatch, waiting, reviews, readyForReview: tasks.length > 0 &&
    tasks.every(task => results.get(task.id)?.state === 'passed') };
}
