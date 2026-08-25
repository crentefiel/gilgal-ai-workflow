import type { DiffSummary } from '../types.js';
import { GitClient } from './git-client.js';

export async function calculateDiff(git: GitClient, stableSha: string, candidateSha: string): Promise<DiffSummary> {
  const numstat = await git.require(
    ['diff', '--numstat', '--no-renames', stableSha, candidateSha],
    'Cannot calculate Git diff statistics',
  );
  const names = await git.require(
    ['diff', '--name-status', '--no-renames', stableSha, candidateSha],
    'Cannot calculate changed files',
  );

  let insertions = 0;
  let deletions = 0;
  for (const line of numstat.split('\n')) {
    if (!line) continue;
    const [added, deleted] = line.split('\t', 3);
    if (added !== '-' && added !== undefined) insertions += Number.parseInt(added, 10) || 0;
    if (deleted !== '-' && deleted !== undefined) deletions += Number.parseInt(deleted, 10) || 0;
  }

  let filesAdded = 0;
  let filesModified = 0;
  let filesDeleted = 0;
  const changedFiles: string[] = [];
  for (const line of names.split('\n')) {
    if (!line) continue;
    const separator = line.indexOf('\t');
    if (separator === -1) continue;
    const status = line.slice(0, separator);
    const file = line.slice(separator + 1);
    changedFiles.push(file);
    if (status.startsWith('A')) filesAdded += 1;
    else if (status.startsWith('D')) filesDeleted += 1;
    else filesModified += 1;
  }

  return { filesAdded, filesModified, filesDeleted, insertions, deletions, changedFiles };
}

export async function getFullDiff(git: GitClient, stableSha: string, candidateSha: string): Promise<string> {
  return git.require(['diff', '--no-ext-diff', '--binary', stableSha, candidateSha], 'Cannot generate full Git diff');
}
