import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateGate } from '../src/gate.js';
import type { CheckResult } from '../src/types.js';

function result(status: CheckResult['status'], critical = true): CheckResult {
  return {
    id: 'result',
    name: 'Result',
    status,
    critical,
    startedAt: '2026-08-25T00:00:00.000Z',
    finishedAt: '2026-08-25T00:00:00.000Z',
    durationMs: 0,
  };
}

test('all passing evidence is READY', () => {
  assert.deepEqual(evaluateGate([result('PASS')], [], [], { blockOnNonCriticalFailure: false }).status, 'READY');
});

test('critical FAIL is BLOCKED with exit 1', () => {
  const gate = evaluateGate([result('FAIL')], [], [], { blockOnNonCriticalFailure: false });
  assert.equal(gate.status, 'BLOCKED');
  assert.equal(gate.exitCode, 1);
});

test('critical PENDING is BLOCKED with exit 2', () => {
  const gate = evaluateGate([result('PENDING')], [], [], { blockOnNonCriticalFailure: false });
  assert.equal(gate.outcome, 'PENDING');
  assert.equal(gate.exitCode, 2);
});

test('non-critical failure follows configured policy', () => {
  assert.equal(evaluateGate([result('FAIL', false)], [], [], { blockOnNonCriticalFailure: false }).status, 'READY');
  assert.equal(evaluateGate([result('FAIL', false)], [], [], { blockOnNonCriticalFailure: true }).status, 'BLOCKED');
});

test('critical regression always blocks', () => {
  const gate = evaluateGate([], [], [{
    contractId: 'login',
    name: 'Login',
    critical: true,
    stableResult: 'PASS',
    candidateResult: 'FAIL',
  }], { blockOnNonCriticalFailure: false });
  assert.equal(gate.exitCode, 1);
  assert.match(gate.reason, /regression/i);
});
