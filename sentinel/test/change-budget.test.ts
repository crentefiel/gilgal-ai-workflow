import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateChangeBudget } from '../src/checks/change-budget.js';
import type { DiffSummary } from '../src/types.js';

const diff: DiffSummary = {
  filesAdded: 1,
  filesModified: 3,
  filesDeleted: 1,
  insertions: 120,
  deletions: 30,
  changedFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
};

test('disabled change budget does not add a check', () => {
  assert.equal(evaluateChangeBudget(diff, { enabled: false, critical: true }), undefined);
});

test('change budget passes when all configured limits are respected', () => {
  const result = evaluateChangeBudget(diff, {
    enabled: true,
    critical: true,
    maxFiles: 5,
    maxInsertions: 120,
    maxDeletions: 30,
    maxChangedLines: 150,
  });
  assert.equal(result?.status, 'PASS');
  assert.match(result?.summary ?? '', /within the configured budget/);
});

test('change budget reports scope expansion when any limit is exceeded', () => {
  const result = evaluateChangeBudget(diff, {
    enabled: true,
    critical: true,
    maxFiles: 4,
    maxChangedLines: 100,
  });
  assert.equal(result?.status, 'FAIL');
  assert.equal(result?.critical, true);
  assert.match(result?.summary ?? '', /SCOPE EXPANSION DETECTED/);
  assert.match(result?.summary ?? '', /files 5 > 4/);
  assert.match(result?.summary ?? '', /changed lines 150 > 100/);
});
