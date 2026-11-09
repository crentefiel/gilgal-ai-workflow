/** Optional host helpers; no model execution, product verification or Gate authority. */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
export type ReviewState = 'completed' | 'incomplete' | 'unavailable' | 'stale';
export interface ReviewSnapshot {
  candidateSha: string; stableSha: string; materials: { path: string; sha256: string }[];
  contractIds: string[]; promptSchemaVersion: string; createdAt: string;
}
export interface Finding {
  id: string; contractId: string; category: string; severity: 'low' | 'medium' | 'high';
  summary: string; source?: string; confirmationHint: string; isHypothesis: boolean;
}
export interface HostExecution {
  executionId: string; reviewerModel: string; isolationMechanism: string; freshSessionDeclared: boolean;
}
export interface IndependentReviewRecord {
  schemaVersion: 1; state: ReviewState; snapshot: ReviewSnapshot; execution: HostExecution | null;
  provenance: 'host-declared' | 'none'; findings: Finding[]; limitations: string[]; createdAt: string; notes?: string;
}
export interface SnapshotOptions {
  candidateSha: string; stableSha: string; materialPaths: string[]; contractIds: string[]; promptSchemaVersion?: string;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty`);
  return value;
}
export function sha256(content: string | Buffer): string { return createHash('sha256').update(content).digest('hex'); }
export async function hashFile(p: string): Promise<string> { return sha256(await fs.readFile(p)); }
function validateSnapshot(s: ReviewSnapshot): void {
  if (![s.candidateSha, s.stableSha].every(v => /^[a-f0-9]{40}$/.test(v))) throw new Error('Expected full Git SHA');
  text(s.promptSchemaVersion, 'promptSchemaVersion');
  if (!s.materials.length || new Set(s.materials.map(m => m.path)).size !== s.materials.length) throw new Error('Missing or duplicate material');
  for (const m of s.materials) {
    text(m.path, 'path'); if (!/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error('Invalid SHA256');
  }
  if (!s.contractIds.length || new Set(s.contractIds).size !== s.contractIds.length) throw new Error('Missing or duplicate contract');
  s.contractIds.forEach(id => text(id, 'contractId'));
}
/** Host selects files. Send captured bytes; do not reopen file paths for transmission. */
export async function captureReviewInput(options: SnapshotOptions): Promise<{
  snapshot: ReviewSnapshot; materials: { path: string; bytes: Buffer }[];
}> {
  const materials = [];
  for (const p of options.materialPaths) materials.push({ path: path.resolve(p), bytes: await fs.readFile(p) });
  const snapshot: ReviewSnapshot = {
    candidateSha: options.candidateSha, stableSha: options.stableSha,
    materials: materials.map(m => ({ path: m.path, sha256: sha256(m.bytes) })),
    contractIds: [...options.contractIds], promptSchemaVersion: options.promptSchemaVersion ?? 'experimental-2',
    createdAt: new Date().toISOString(),
  };
  validateSnapshot(snapshot); return { snapshot, materials };
}
export async function buildSnapshot(options: SnapshotOptions): Promise<ReviewSnapshot> { return (await captureReviewInput(options)).snapshot; }
export function prepareReviewMaterials(input: Awaited<ReturnType<typeof captureReviewInput>>): { path: string; bytes: Buffer }[] {
  validateSnapshot(input.snapshot);
  if (input.materials.length !== input.snapshot.materials.length) throw new Error('Material count mismatch');
  return input.snapshot.materials.map((m, i) => {
    const c = input.materials[i];
    if (!c || c.path !== m.path) throw new Error('Material path mismatch');
    const bytes = Buffer.from(c.bytes);
    if (sha256(bytes) !== m.sha256) throw new Error('Captured bytes changed');
    return { path: m.path, bytes };
  });
}
export async function verifySnapshotMaterials(s: ReviewSnapshot): Promise<void> {
  validateSnapshot(s);
  for (const m of s.materials) if (await hashFile(m.path) !== m.sha256) throw new Error(`Material changed: ${m.path}`);
}
export async function isSnapshotCurrent(s: ReviewSnapshot, candidateSha: string, stableSha: string): Promise<boolean> {
  if (s.candidateSha !== candidateSha || s.stableSha !== stableSha) return false;
  try { await verifySnapshotMaterials(s); return true; } catch { return false; }
}
export function validateFindings(raw: unknown, s: ReviewSnapshot): Finding[] {
  validateSnapshot(s);
  if (!Array.isArray(raw)) throw new Error('Findings must be an array');
  const seen = new Set<string>();
  return raw.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid finding');
    const f = item as Record<string, unknown>, id = text(f.id, 'id'), contractId = text(f.contractId, 'contractId');
    if (seen.has(id)) throw new Error('Duplicate finding ID'); seen.add(id);
    if (!s.contractIds.includes(contractId)) throw new Error('Unknown contract');
    if (!['low', 'medium', 'high'].includes(String(f.severity))) throw new Error('Invalid severity');
    if (typeof f.isHypothesis !== 'boolean') throw new Error('isHypothesis must be boolean');
    const result: Finding = { id, contractId, category: text(f.category, 'category'), severity: f.severity as Finding['severity'],
      summary: text(f.summary, 'summary'), confirmationHint: text(f.confirmationHint, 'confirmationHint'), isHypothesis: f.isHypothesis };
    if (f.source !== undefined) {
      result.source = text(f.source, 'source');
      if (!s.materials.some(m => m.path === result.source)) throw new Error('Source not in snapshot');
    }
    if (!result.isHypothesis && !result.source) throw new Error('Non-hypothesis requires a source');
    return result;
  });
}
export function createCompletedRecord(snapshot: ReviewSnapshot, raw: unknown, options: { execution?: HostExecution; limitations?: string[] } = {}): IndependentReviewRecord {
  const findings = validateFindings(raw, snapshot);
  let execution: HostExecution | null = null;
  if (options.execution) {
    const e = options.execution;
    if (typeof e.freshSessionDeclared !== 'boolean') throw new Error('Invalid session declaration');
    execution = { executionId: text(e.executionId, 'executionId'), reviewerModel: text(e.reviewerModel, 'reviewerModel'),
      isolationMechanism: text(e.isolationMechanism, 'isolationMechanism'), freshSessionDeclared: e.freshSessionDeclared };
  }
  const limitations = [...(options.limitations ?? [])]; limitations.forEach(l => text(l, 'limitation'));
  if (!execution?.freshSessionDeclared) limitations.push('No host-declared fresh session; independent review unavailable.');
  return { schemaVersion: 1, state: execution?.freshSessionDeclared ? 'completed' : 'unavailable',
    snapshot: structuredClone(snapshot), execution, provenance: execution ? 'host-declared' : 'none',
    findings, limitations, createdAt: new Date().toISOString() };
}
export function markStale(record: IndependentReviewRecord, reason: string): IndependentReviewRecord {
  return { ...structuredClone(record), state: 'stale', notes: text(reason, 'reason') };
}
/** Trusted host supplies a dedicated review-only directory, separate from evidence. */
export async function saveReviewRecord(directory: string, record: IndependentReviewRecord): Promise<string> {
  validateFindings(record.findings, record.snapshot);
  await fs.mkdir(directory, { recursive: true });
  const destination = path.join(directory, `review-${record.snapshot.candidateSha.slice(0, 12)}-${randomUUID()}.json`);
  await fs.writeFile(destination, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 }); return destination;
}
