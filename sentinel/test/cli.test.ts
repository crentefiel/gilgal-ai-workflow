import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { basicConfig, createGitProject, git, removeProject, writeJson } from './helpers.js';

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/cli.js');

function cli(cwd: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('CLI supports check, status, report, approve, revoke, and reset', async () => {
  const directory = await createGitProject();
  try {
    const missingConfig = cli(directory, 'sentinel', 'status', '--config', 'missing.json');
    assert.equal(missingConfig.status, 3);

    const stableSha = git(directory, 'rev-parse', 'HEAD');
    git(directory, 'branch', 'stable-ref', stableSha);
    await writeJson(directory, 'gilgal.sentinel.json', { ...basicConfig(), checks: {} });
    await writeJson(directory, 'gilgal.contracts.json', {
      version: 1,
      contracts: [{ id: 'physical', name: 'Physical validation', critical: true, type: 'manual' }],
    });
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'candidate');

    const pending = cli(directory, 'sentinel', 'check');
    assert.equal(pending.status, 2, pending.stderr);
    assert.match(pending.stdout, /Gate: BLOCKED/);

    const approve = cli(directory, 'sentinel', 'approve', 'physical');
    assert.equal(approve.status, 0, approve.stderr);
    assert.match(approve.stdout, /Human approval recorded/);

    const ready = cli(directory, 'sentinel', 'check');
    assert.equal(ready.status, 0, ready.stderr);
    assert.match(ready.stdout, /Gate: READY/);

    const status = cli(directory, 'sentinel', 'status');
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Last result: PASS/);

    const report = cli(directory, 'sentinel', 'report', '--json');
    assert.equal(report.status, 0, report.stderr);
    assert.equal(JSON.parse(report.stdout).gate.status, 'READY');

    const revoke = cli(directory, 'sentinel', 'revoke', 'physical');
    assert.equal(revoke.status, 0, revoke.stderr);
    assert.match(revoke.stdout, /revoked/);

    const reset = cli(directory, 'sentinel', 'reset', '--yes');
    assert.equal(reset.status, 0, reset.stderr);
    assert.match(reset.stdout, /Project code and Git were untouched/);

    const invalidReportTarget = { ...basicConfig(), checks: {}, reports: { directory: 'tracked.txt', json: true, markdown: true } };
    await writeJson(directory, 'gilgal.sentinel.json', invalidReportTarget);
    git(directory, 'add', 'gilgal.sentinel.json');
    git(directory, 'commit', '-m', 'configure invalid report target');
    const internalError = cli(directory, 'sentinel', 'check');
    assert.equal(internalError.status, 4);
  } finally {
    await removeProject(directory);
  }
});
