import test from 'node:test';
import assert from 'node:assert/strict';
import { planSwarm, planWork, programmerProfile, type WorkTask, type WorkResult } from '../src/work-coordinator.js';

const task = (id: string, writes: string[], dependsOn: string[] = []): WorkTask => ({
  id, writes, dependsOn, goal: id, acceptance: ['Run the relevant test'],
  preserves: ['Keep WhatsApp unchanged'], surfaces: [],
});

test('dispatches independent tasks and waits on case-insensitive overlapping paths', () => {
  const plan = planWork([task('pdf', ['src/PDF.ts']), task('gui', ['src/gui.ts']),
    task('other-pdf', ['src/pdf.ts']), task('export-test', ['test/pdf.ts'], ['pdf'])]);
  assert.deepEqual(plan.dispatch.map(x => x.task.id), ['pdf', 'gui']);
  assert.deepEqual(plan.waiting, [
    { id: 'other-pdf', reason: 'write-conflict', on: ['pdf'] },
    { id: 'export-test', reason: 'dependency', on: ['pdf'] },
  ]);
  assert.equal(plan.readyForReview, false);
});

test('retries only failed work with evidence; dependent work waits', () => {
  const tasks = [task('pdf', ['pdf.ts']), task('gui', ['gui.ts']), task('test', ['pdf.test.ts'], ['pdf'])];
  const results = new Map<string, WorkResult>([
    ['pdf', { state: 'failed', attempt: 1, evidence: 'PDF page 7 is missing' }],
    ['gui', { state: 'passed', attempt: 1, evidence: 'GUI smoke test passed' }],
  ]);
  assert.deepEqual(planWork(tasks, results).dispatch, [
    { task: tasks[0], worker: programmerProfile, attempt: 2, previousFailure: 'PDF page 7 is missing' },
  ]);
  assert.equal(planWork(tasks, results, 1).waiting[0]?.reason, 'attempt-limit');
  results.set('pdf', { state: 'passed', attempt: 2, evidence: 'All seven pages render' });
  assert.deepEqual(planWork(tasks, results).dispatch.map(x => x.task.id), ['test']);
});

test('does not schedule writes held by running work', () => {
  const results = new Map<string, WorkResult>([['pdf', { state: 'running', attempt: 1 }]]);
  const plan = planWork([task('pdf', ['src/pdf']), task('fix', ['src/pdf/view.ts'])], results);
  assert.equal(plan.dispatch.length, 0);
  assert.equal(plan.waiting[0]?.reason, 'write-conflict');
});

test('routes specialists by surface and marks review readiness only after all tasks pass', () => {
  const tasks: WorkTask[] = [{ ...task('tauri', ['src-tauri/src/lib.rs']), surfaces: ['architecture', 'security', 'complexity'] }];
  assert.equal(planWork(tasks).readyForReview, false);
  const plan = planWork(tasks, new Map([['tauri', { state: 'passed', attempt: 1, evidence: 'Local verification log' }]]));
  assert.equal(plan.readyForReview, true);
  assert.deepEqual(plan.reviews.map(x => x.role), ['security-audit', 'egm']);
  assert.ok(plan.reviews.every(x => x.mode === 'fresh-session' && x.access === 'read-only'));
});

test('rejects invalid paths, cycles, unknown dependencies and unsubstantiated results', () => {
  assert.throws(() => planWork([task('a', ['../STABLE'])]), /path/);
  assert.throws(() => planWork([task('a', ['.git/config'])]), /path/);
  assert.throws(() => planWork([task('a', [], ['b']), task('b', [], ['a'])]), /cycle/);
  assert.throws(() => planWork([task('a', [], ['b'])]), /Unknown dependency/);
  assert.throws(() => planWork([task('a', [])], new Map([['a', { state: 'passed', attempt: 1 }]])), /Invalid result/);
});

test('Swarm checks scope before writing, assigns Ponytail, then sends final pair to Security and EGM', () => {
  const tasks = [task('pdf', ['src/pdf.ts'])];
  const initial = { stableSha: 'a'.repeat(40), workSha: 'b'.repeat(40) };
  const current = { ...initial, workSha: 'c'.repeat(40) };
  const start = planSwarm(tasks, initial, initial);
  assert.ok('request' in start);
  const { planHash } = start.request;
  const before = { ...initial, planHash, phase: 'security-before' as const, role: 'security-audit' as const, verdict: 'allow' as const, evidence: 'Reviewed declared scope' };
  const after = { ...current, planHash, phase: 'security-after' as const, role: 'security-audit' as const, verdict: 'allow' as const, evidence: 'Reviewed candidate diff' };
  assert.equal(planSwarm(tasks, initial, initial).dispatch.length, 0);
  assert.equal(planSwarm(tasks, initial, initial, { before: { ...before, verdict: 'block' } }).dispatch.length, 0);
  assert.equal(planSwarm(tasks, initial, initial, { before }).dispatch[0]?.worker.role, 'ponytail');
  assert.equal(planSwarm([task('pdf', ['src/extra.ts'])], initial, initial, { before }).phase, 'security-before');
  const results = new Map<string, WorkResult>([['pdf', { state: 'passed', attempt: 1, evidence: 'PDF test log' }]]);
  assert.equal(planSwarm(tasks, initial, current, { before }, results).phase, 'security-after');
  const request = planSwarm(tasks, initial, current, { before, after }, results);
  assert.equal(request.phase, 'egm-diff');
  assert.ok('request' in request);
  assert.deepEqual([request.request.role, request.request.stableSha, request.request.workSha], ['egm', initial.stableSha, current.workSha]);
  assert.equal(planSwarm(tasks, initial, current, { before, after, comparison: after }, results).readyForGate, false);
  const comparison = { ...after, phase: 'egm-diff' as const, role: 'egm' as const };
  assert.equal(planSwarm(tasks, initial, current, { before, after, comparison }, results).readyForGate, true);
  assert.equal(planSwarm(tasks, initial, { ...current, workSha: 'd'.repeat(40) }, { before, after, comparison: after }, results).phase, 'security-after');
  assert.equal(planSwarm(tasks, initial, { ...current, stableSha: 'd'.repeat(40) }, { before, after, comparison: after }, results).status, 'stable-changed');
});
