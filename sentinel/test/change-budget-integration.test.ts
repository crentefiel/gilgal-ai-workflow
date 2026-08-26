import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { runSentinelCheck } from '../src/sentinel.js';
import { basicConfig, createGitProject, git, removeProject, writeJson } from './helpers.js';

test('critical Change Budget failure blocks promotion', async () => {
  const directory = await createGitProject();
  try {
    const stableSha = git(directory, 'rev-parse', 'HEAD');
    git(directory, 'branch', 'stable-ref', stableSha);
    await writeJson(directory, 'gilgal.sentinel.json', {
      ...basicConfig(),
      checks: {},
      changeBudget: {
        enabled: true,
        critical: true,
        maxFiles: 1,
      },
    });
    await writeJson(directory, 'gilgal.contracts.json', { version: 1, contracts: [] });
    await writeFile(path.join(directory, 'another-change.txt'), 'scope expansion\n', 'utf8');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'candidate exceeds budget');

    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report } = await runSentinelCheck(loaded.config, directory);
    const budget = report.checks.find((item) => item.id === 'change-budget');
    assert.equal(budget?.status, 'FAIL');
    assert.match(budget?.summary ?? '', /SCOPE EXPANSION DETECTED/);
    assert.equal(report.gate.status, 'BLOCKED');
    assert.equal(report.gate.exitCode, 1);
  } finally {
    await removeProject(directory);
  }
});
