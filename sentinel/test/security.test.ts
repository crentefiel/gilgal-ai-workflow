import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedGitSubcommands, GitClient } from '../src/git/git-client.js';
import { runCommand } from '../src/runner/command-runner.js';
import { createGitProject, removeProject } from './helpers.js';

test('Sentinel Git layer allows only read-only operations', async () => {
  assert.deepEqual([...allowedGitSubcommands].sort(), ['diff', 'log', 'merge-base', 'rev-parse', 'status']);
  const directory = await createGitProject();
  try {
    const client = new GitClient(directory);
    for (const command of ['merge', 'push', 'reset', 'clean', 'checkout', 'rebase', 'branch']) {
      await assert.rejects(() => client.run([command]), /not allowed/);
    }
  } finally {
    await removeProject(directory);
  }
});

test('configured commands cannot bypass read-only Git protection', async () => {
  for (const command of ['merge', 'push', 'reset', 'clean', 'checkout', 'rebase', 'branch']) {
    await assert.rejects(
      () => runCommand(`git ${command}`, { cwd: process.cwd(), timeoutMs: 1_000, outputLimitBytes: 1_024 }),
      /not read-only and is forbidden/,
    );
  }
});
