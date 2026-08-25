import assert from 'node:assert/strict';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { calculateDiff } from '../src/git/diff.js';
import { GitClient } from '../src/git/git-client.js';
import { createGitProject, git, removeProject } from './helpers.js';

test('resolves stable/candidate SHAs and calculates diff', async () => {
  const directory = await createGitProject();
  try {
    const stableSha = git(directory, 'rev-parse', 'HEAD');
    git(directory, 'branch', 'stable-ref', stableSha);
    await writeFile(path.join(directory, 'tracked.txt'), 'candidate\nextra\n', 'utf8');
    await writeFile(path.join(directory, 'added.txt'), 'new\n', 'utf8');
    await rm(path.join(directory, 'removable.txt'));
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'candidate');

    const client = new GitClient(directory);
    assert.equal(await client.resolveRef('stable-ref'), stableSha);
    assert.equal(await client.resolveRef('HEAD'), git(directory, 'rev-parse', 'HEAD'));
    assert.equal(await client.isAncestor(stableSha, await client.resolveRef('HEAD')), true);
    const diff = await calculateDiff(client, stableSha, await client.resolveRef('HEAD'));
    assert.equal(diff.filesAdded, 1);
    assert.equal(diff.filesModified, 1);
    assert.equal(diff.filesDeleted, 1);
    assert.ok(diff.insertions >= 2);
  } finally {
    await removeProject(directory);
  }
});

test('detects an unrelated candidate instead of assuming ancestry', async () => {
  const directory = await createGitProject();
  try {
    const stableSha = git(directory, 'rev-parse', 'HEAD');
    const tree = git(directory, 'rev-parse', 'HEAD^{tree}');
    const unrelatedSha = git(directory, 'commit-tree', tree, '-m', 'unrelated root');
    git(directory, 'update-ref', 'refs/heads/unrelated', unrelatedSha);
    const client = new GitClient(directory);
    assert.equal(await client.isAncestor(stableSha, unrelatedSha), false);
    assert.equal(await client.mergeBase(stableSha, unrelatedSha), '');
  } finally {
    await removeProject(directory);
  }
});
