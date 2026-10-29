/**
 * Experimental independent review prototype for GILGAL SENTINEL.
 *
 * Optional, separate from Gate. Does not assign VERIFIED, authenticate human
 * approval, or authorize promotion. Findings are pendencies only.
 *
 * See issue #26.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ReviewState = 'completed' | 'incomplete' | 'unavailable' | 'stale';

export interface MaterialHash {
  path: string;
  sha256: string;
}

export interface ReviewSnapshot {
  candidateSha: string;
  stableSha: string;
  materials: MaterialHash[];
  promptSchemaVersion: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  contractId?: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  source?: string;
  confirmationHint?: string;
  isHypothesis?: boolean;
}

export interface IndependentReviewRecord {
  schemaVersion: 1;
  state: ReviewState;
  snapshot: ReviewSnapshot;
  reviewerModel?: string;
  isolationMechanism?: string;
  findings: Finding[];
  limitations: string[];
  durationMs?: number;
  tokensUsed?: number;
  createdAt: string;
  notes?: string;
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return sha256(content);
}

export async function buildSnapshot(options: {
  candidateSha: string;
  stableSha: string;
  materialPaths: string[];
  promptSchemaVersion?: string;
}): Promise<ReviewSnapshot> {
  const materials: MaterialHash[] = [];
  for (const p of options.materialPaths) {
    materials.push({ path: p, sha256: await hashFile(p) });
  }
  return {
    candidateSha: options.candidateSha,
    stableSha: options.stableSha,
    materials,
    promptSchemaVersion: options.promptSchemaVersion ?? 'experimental-1',
    createdAt: new Date().toISOString(),
  };
}

export function validateFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) throw new Error('Findings must be an array');
  return raw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Finding at index ${index} is not an object`);
    }
    const f = item as Record<string, unknown>;
    if (typeof f.id !== 'string' || !f.id) throw new Error(`Finding ${index} missing id`);
    if (typeof f.category !== 'string') throw new Error(`Finding ${index} missing category`);
    if (typeof f.severity !== 'string' || !['low', 'medium', 'high'].includes(f.severity)) {
      throw new Error(`Finding ${index} invalid severity`);
    }
    if (typeof f.summary !== 'string') throw new Error(`Finding ${index} missing summary`);
    return {
      id: f.id,
      contractId: typeof f.contractId === 'string' ? f.contractId : undefined,
      category: f.category,
      severity: f.severity as Finding['severity'],
      summary: f.summary,
      source: typeof f.source === 'string' ? f.source : undefined,
      confirmationHint: typeof f.confirmationHint === 'string' ? f.confirmationHint : undefined,
      isHypothesis: f.isHypothesis === true,
    };
  });
}

export async function saveReviewRecord(
  directory: string,
  record: IndependentReviewRecord,
): Promise<string> {
  await fs.mkdir(directory, { recursive: true });
  const filename = `review-${record.snapshot.candidateSha.slice(0, 12)}-${Date.now()}.json`;
  const fullPath = path.join(directory, filename);
  await fs.writeFile(fullPath, JSON.stringify(record, null, 2), 'utf8');
  return fullPath;
}

export function createCompletedRecord(
  snapshot: ReviewSnapshot,
  findings: Finding[],
  options: {
    reviewerModel?: string;
    isolationMechanism?: string;
    limitations?: string[];
    durationMs?: number;
    tokensUsed?: number;
    notes?: string;
  } = {},
): IndependentReviewRecord {
  return {
    schemaVersion: 1,
    state: 'completed',
    snapshot,
    reviewerModel: options.reviewerModel,
    isolationMechanism: options.isolationMechanism ?? 'external-fresh-session',
    findings,
    limitations: options.limitations ?? [],
    durationMs: options.durationMs,
    tokensUsed: options.tokensUsed,
    createdAt: new Date().toISOString(),
    notes: options.notes,
  };
}

export function markStale(record: IndependentReviewRecord, reason: string): IndependentReviewRecord {
  return {
    ...record,
    state: 'stale',
    notes: [record.notes, `Marked stale: ${reason}`].filter(Boolean).join('\n'),
  };
}
