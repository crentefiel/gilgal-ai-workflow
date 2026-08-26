import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, resolveProjectPath } from '../src/config.js';
import { ConfigurationError } from '../src/errors.js';
import { basicConfig, writeJson } from './helpers.js';

test('loads a valid configuration and applies defaults', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sentinel-config-'));
  try {
    await writeJson(directory, 'gilgal.sentinel.json', basicConfig());
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    assert.equal(loaded.config.version, 1);
    assert.equal(loaded.config.defaults.outputLimitBytes, 50 * 1024);
    assert.equal(loaded.config.git.requireStableAncestor, true);
    assert.equal(loaded.config.changeBudget.enabled, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('loads an enabled change budget, allows zero-tolerance limits, and rejects invalid budgets', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sentinel-config-'));
  try {
    await writeJson(directory, 'budget.json', {
      ...basicConfig(),
      changeBudget: {
        enabled: true,
        critical: true,
        maxFiles: 8,
        maxChangedLines: 500,
      },
    });
    const loaded = await loadConfig('budget.json', directory);
    assert.equal(loaded.config.changeBudget.enabled, true);
    assert.equal(loaded.config.changeBudget.maxFiles, 8);
    assert.equal(loaded.config.changeBudget.maxChangedLines, 500);

    await writeJson(directory, 'zero-budget.json', {
      ...basicConfig(),
      changeBudget: {
        enabled: true,
        critical: true,
        maxFiles: 0,
        maxInsertions: 0,
        maxDeletions: 0,
        maxChangedLines: 0,
      },
    });
    const zeroBudget = await loadConfig('zero-budget.json', directory);
    assert.equal(zeroBudget.config.changeBudget.maxFiles, 0);
    assert.equal(zeroBudget.config.changeBudget.maxInsertions, 0);
    assert.equal(zeroBudget.config.changeBudget.maxDeletions, 0);
    assert.equal(zeroBudget.config.changeBudget.maxChangedLines, 0);

    await writeJson(directory, 'bad-budget.json', {
      ...basicConfig(),
      changeBudget: { enabled: true },
    });
    await assert.rejects(() => loadConfig('bad-budget.json', directory), /at least one limit/);

    await writeJson(directory, 'negative-budget.json', {
      ...basicConfig(),
      changeBudget: { enabled: true, maxDeletions: -1 },
    });
    await assert.rejects(() => loadConfig('negative-budget.json', directory), /non-negative integer/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports a missing configuration', async () => {
  await assert.rejects(() => loadConfig('does-not-exist.json', os.tmpdir()), ConfigurationError);
});

test('reports invalid JSON', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sentinel-config-'));
  try {
    await writeFile(path.join(directory, 'bad.json'), '{ nope', 'utf8');
    await assert.rejects(() => loadConfig('bad.json', directory), /Invalid JSON/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports missing required fields and rejects path traversal', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sentinel-config-'));
  try {
    await writeJson(directory, 'missing.json', { version: 1, stable: { ref: 'main' } });
    await assert.rejects(() => loadConfig('missing.json', directory), /candidate is required/);
    assert.throws(() => resolveProjectPath(directory, '../../outside', 'reports.directory'), ConfigurationError);
    assert.throws(() => resolveProjectPath(directory, '.git/config', 'contractsFile'), ConfigurationError);
    await writeJson(directory, 'root-state.json', { ...basicConfig(), stateDirectory: '.' });
    await assert.rejects(() => loadConfig('root-state.json', directory), /must be a subdirectory/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
