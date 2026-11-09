import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { captureReviewInput, prepareReviewMaterials, verifySnapshotMaterials, isSnapshotCurrent,
  validateFindings, createCompletedRecord, saveReviewRecord, markStale, sha256 } from '../src/independent-review.js';
const candidateSha = 'a'.repeat(40), stableSha = 'b'.repeat(40);
async function fixture(run: (input: Awaited<ReturnType<typeof captureReviewInput>>, root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gilgal-review-'));
  try {
    const file = path.join(root, 'evidence.json');
    await writeFile(file, '{"pdfExport":{"pages":7},"physicalPrint":null,"whatsapp":null}');
    await run(await captureReviewInput({ candidateSha, stableSha, materialPaths: [file], contractIds: ['PDF', 'PRINT', 'WHATSAPP'] }), root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
function finding(source: string) {
  return { id: 'F1', contractId: 'PRINT', category: 'missing-evidence', severity: 'high',
    summary: 'Export does not demonstrate physical printing', source,
    confirmationHint: 'Obtain the required operator observation', isHypothesis: false };
}
describe('independent review helpers (no model execution)', () => {
  it('hashes exact bytes', () => assert.equal(sha256('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'));
  it('sends captured bytes even after the file changes', () => fixture(async input => {
    const source = input.materials[0]!, before = Buffer.from(source.bytes);
    await writeFile(source.path, 'changed');
    assert.deepEqual(prepareReviewMaterials(input)[0]!.bytes, before);
    await assert.rejects(verifySnapshotMaterials(input.snapshot), /changed/);
    assert.equal(await isSnapshotCurrent(input.snapshot, candidateSha, stableSha), false);
  }));
  it('rejects mutation of captured bytes', () => fixture(async input => {
    input.materials[0]!.bytes[0] = 0; assert.throws(() => prepareReviewMaterials(input), /bytes changed/);
  }));
  it('detects removed files and SHA drift', () => fixture(async input => {
    assert.equal(await isSnapshotCurrent(input.snapshot, candidateSha, stableSha), true);
    assert.equal(await isSnapshotCurrent(input.snapshot, 'c'.repeat(40), stableSha), false);
    assert.equal(await isSnapshotCurrent(input.snapshot, candidateSha, 'd'.repeat(40)), false);
    await rm(input.materials[0]!.path); await assert.rejects(verifySnapshotMaterials(input.snapshot));
    assert.equal(await isSnapshotCurrent(input.snapshot, candidateSha, stableSha), false);
  }));
  it('requires full SHA and unique contract/material IDs', () => fixture(async input => {
    await assert.rejects(captureReviewInput({ candidateSha: 'abc123', stableSha, materialPaths: [input.materials[0]!.path], contractIds: ['PRINT'] }));
    assert.throws(() => prepareReviewMaterials({ ...input, snapshot: { ...input.snapshot, contractIds: ['PRINT', 'PRINT'] } }));
    await assert.rejects(captureReviewInput({ candidateSha, stableSha, materialPaths: [input.materials[0]!.path, input.materials[0]!.path], contractIds: ['PRINT'] }));
  }));
  it('validates references and rejects malformed findings', () => fixture(async input => {
    const f = finding(input.materials[0]!.path); assert.equal(validateFindings([f], input.snapshot).length, 1);
    for (const patch of [{ source: 'missing' }, { source: ' ' }, { contractId: 'UNKNOWN' }, { isHypothesis: 'false' },
      { isHypothesis: undefined }, { summary: '' }, { confirmationHint: '' }, { severity: 'critical' }]) {
      assert.throws(() => validateFindings([{ ...f, ...patch }], input.snapshot));
    }
    assert.throws(() => validateFindings([f, f], input.snapshot), /Duplicate/);
    assert.throws(() => validateFindings({}, input.snapshot)); assert.throws(() => validateFindings([null], input.snapshot));
  }));
  it('allows explicit hypotheses without fabricating a source', () => fixture(async input => {
    const { source: _, ...f } = finding(input.materials[0]!.path);
    assert.throws(() => validateFindings([f], input.snapshot), /requires a source/);
    assert.equal('source' in validateFindings([{ ...f, isHypothesis: true }], input.snapshot)[0]!, false);
  }));
  it('does not invent provenance and validates raw output at completion', () => fixture(async input => {
    const r = createCompletedRecord(input.snapshot, []);
    assert.equal(r.state, 'unavailable'); assert.equal(r.provenance, 'none'); assert.equal(r.execution, null);
    assert.throws(() => createCompletedRecord(input.snapshot, [{}]));
    assert.equal(createCompletedRecord(input.snapshot, [], { execution: {
      executionId: 'mock', reviewerModel: 'mock', isolationMechanism: 'mock', freshSessionDeclared: false,
    } }).state, 'unavailable');
  }));
  it('saves separate records without overwrite and copies snapshot', () => fixture(async (input, root) => {
    const r = createCompletedRecord(input.snapshot, [finding(input.materials[0]!.path)], { execution: {
      executionId: 'simulated', reviewerModel: 'mock', isolationMechanism: 'test-double', freshSessionDeclared: true,
    }, limitations: ['Synthetic host declaration; no real AI session.'] });
    input.snapshot.contractIds.push('LATER'); assert.equal(r.snapshot.contractIds.includes('LATER'), false);
    assert.equal(r.provenance, 'host-declared'); assert.equal(r.state, 'completed');
    const a = await saveReviewRecord(path.join(root, 'reviews'), r), b = await saveReviewRecord(path.join(root, 'reviews'), r);
    assert.notEqual(a, b); assert.equal(JSON.parse(await readFile(a, 'utf8')).schemaVersion, 1);
    assert.equal(markStale(r, 'HEAD changed').state, 'stale'); assert.equal(r.state, 'completed');
  }));
});
