import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { loadContracts } from '../src/contracts/contract-loader.js';
import { approveManualContract } from '../src/contracts/manual-approval.js';
import { runSentinelCheck } from '../src/sentinel.js';
import { StateStore } from '../src/state/state-store.js';
import { basicConfig, createGitProject, git, nodeCommand, removeProject, writeJson } from './helpers.js';

async function configureCandidate(
  directory: string,
  contracts: unknown[],
  checks: Record<string, unknown> = {},
): Promise<{ stableSha: string; candidateSha: string }> {
  const stableSha = git(directory, 'rev-parse', 'HEAD');
  git(directory, 'branch', 'stable-ref', stableSha);
  const config = { ...basicConfig(), checks };
  await writeJson(directory, 'gilgal.sentinel.json', config);
  await writeJson(directory, 'gilgal.contracts.json', { version: 1, contracts });
  await writeJson(directory, `.gilgal/baselines/${stableSha}.json`, {
    stableSha,
    contracts: Object.fromEntries(contracts.map((item) => [(item as { id: string }).id, 'PASS'])),
  });
  await writeFile(path.join(directory, 'tracked.txt'), 'candidate\n', 'utf8');
  git(directory, 'add', '.');
  git(directory, 'commit', '-m', 'candidate');
  return { stableSha, candidateSha: git(directory, 'rev-parse', 'HEAD') };
}

test('full check writes JSON/Markdown reports and returns READY', async () => {
  const directory = await createGitProject();
  try {
    await configureCandidate(
      directory,
      [{ id: 'command-contract', name: 'Command contract', critical: true, type: 'command', command: nodeCommand('process.exit(0)') }],
      {
        typecheck: { enabled: true, command: nodeCommand('process.exit(0)') },
        tests: { enabled: true, command: nodeCommand('process.exit(0)') },
        build: { enabled: true, command: nodeCommand('process.exit(0)') },
      },
    );
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report, written } = await runSentinelCheck(loaded.config, loaded.projectRoot);
    assert.equal(report.sentinelVersion, '0.2.0');
    assert.equal(report.gate.status, 'READY');
    assert.equal(report.gate.exitCode, 0);
    assert.deepEqual(report.checks.map((item) => [item.id, item.status]), [
      ['typecheck', 'PASS'],
      ['tests', 'PASS'],
      ['build', 'PASS'],
    ]);
    assert.equal(report.contracts[0]?.status, 'PASS');
    assert.equal(report.contracts[0]?.stableResult, 'PASS');
    assert.equal(report.regressionReplay.total, 0);
    assert.ok(written.json);
    assert.ok(written.markdown);
    await access(written.json!);
    await access(written.markdown!);
    assert.equal((await new StateStore(directory, loaded.config.stateDirectory).loadLastReport())?.gate.status, 'READY');
  } finally {
    await removeProject(directory);
  }
});

test('STABLE PASS and CANDIDATE FAIL is a blocking regression', async () => {
  const directory = await createGitProject();
  try {
    await configureCandidate(directory, [{
      id: 'regression-contract',
      name: 'Regression contract',
      critical: true,
      type: 'command',
      command: nodeCommand('process.exit(1)'),
    }]);
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report } = await runSentinelCheck(loaded.config, loaded.projectRoot);
    assert.equal(report.contracts[0]?.stableResult, 'PASS');
    assert.equal(report.contracts[0]?.candidateResult, 'FAIL');
    assert.equal(report.regressions.length, 1);
    assert.equal(report.gate.status, 'BLOCKED');
    assert.equal(report.gate.exitCode, 1);
  } finally {
    await removeProject(directory);
  }
});

test('regression replay executes a remembered bug check and blocks if it returns', async () => {
  const directory = await createGitProject();
  try {
    await configureCandidate(directory, [{
      id: 'qr-state-regression',
      name: 'QR state leaves waiting screen after authentication',
      critical: true,
      type: 'replay',
      origin: 'A previously fixed QR/authentication regression',
      description: 'Every known regression should become a replayable contract.',
      command: nodeCommand('process.exit(1)'),
    }]);
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report } = await runSentinelCheck(loaded.config, loaded.projectRoot);
    assert.equal(report.contracts[0]?.type, 'replay');
    assert.equal(report.contracts[0]?.replayOrigin, 'A previously fixed QR/authentication regression');
    assert.equal(report.contracts[0]?.candidateResult, 'FAIL');
    assert.equal(report.regressionReplay.total, 1);
    assert.equal(report.regressionReplay.fail, 1);
    assert.equal(report.regressions.length, 1);
    assert.equal(report.gate.status, 'BLOCKED');
  } finally {
    await removeProject(directory);
  }
});

test('manual approval is SHA-bound, revokeable, and stale after a commit', async () => {
  const directory = await createGitProject();
  try {
    await configureCandidate(directory, [{
      id: 'physical-device',
      name: 'Physical device',
      critical: true,
      type: 'manual',
    }]);
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const contracts = await loadContracts(directory, loaded.config.contractsFile);
    const state = new StateStore(directory, loaded.config.stateDirectory);

    const withoutApproval = await runSentinelCheck(loaded.config, directory);
    assert.equal(withoutApproval.report.contracts[0]?.status, 'PENDING');
    assert.equal(withoutApproval.report.gate.exitCode, 2);

    await approveManualContract(loaded.config, directory, contracts.contracts, 'physical-device');
    const approved = await runSentinelCheck(loaded.config, directory);
    assert.equal(approved.report.contracts[0]?.status, 'PASS');
    assert.equal(approved.report.contracts[0]?.approvalState, 'VALID');

    assert.equal(await state.revokeApproval('physical-device'), true);
    const revoked = await runSentinelCheck(loaded.config, directory);
    assert.equal(revoked.report.contracts[0]?.status, 'PENDING');
    assert.equal(revoked.report.contracts[0]?.approvalState, 'MISSING');

    await approveManualContract(loaded.config, directory, contracts.contracts, 'physical-device');
    await writeFile(path.join(directory, 'tracked.txt'), 'candidate changed\n', 'utf8');
    git(directory, 'add', 'tracked.txt');
    git(directory, 'commit', '-m', 'change candidate SHA');
    const stale = await runSentinelCheck(loaded.config, directory);
    assert.equal(stale.report.contracts[0]?.status, 'PENDING');
    assert.equal(stale.report.contracts[0]?.approvalState, 'STALE');
  } finally {
    await removeProject(directory);
  }
});

test('absence of a baseline never invents PASS', async () => {
  const directory = await createGitProject();
  try {
    const stableSha = git(directory, 'rev-parse', 'HEAD');
    git(directory, 'branch', 'stable-ref', stableSha);
    await writeJson(directory, 'gilgal.sentinel.json', { ...basicConfig(), checks: {} });
    await writeJson(directory, 'gilgal.contracts.json', {
      version: 1,
      contracts: [{ id: 'unknown-baseline', name: 'Unknown baseline', critical: true, type: 'command', command: nodeCommand('process.exit(0)') }],
    });
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'candidate without baseline');
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report } = await runSentinelCheck(loaded.config, directory);
    assert.equal(report.contracts[0]?.stableResult, 'NOT_RECORDED');
    assert.equal(report.regressions.length, 0);
  } finally {
    await removeProject(directory);
  }
});

test('dirty Git state blocks promotion before configured commands run', async () => {
  const directory = await createGitProject();
  try {
    await configureCandidate(directory, [], {
      tests: {
        enabled: true,
        command: nodeCommand('require("node:fs").writeFileSync("marker.txt","ran")'),
      },
    });
    await writeFile(path.join(directory, 'tracked.txt'), 'uncommitted candidate\n', 'utf8');
    const loaded = await loadConfig('gilgal.sentinel.json', directory);
    const { report } = await runSentinelCheck(loaded.config, directory);
    assert.equal(report.gate.status, 'BLOCKED');
    assert.equal(report.checks[0]?.id, 'git-working-tree');
    await assert.rejects(() => access(path.join(directory, 'marker.txt')));
  } finally {
    await removeProject(directory);
  }
});
