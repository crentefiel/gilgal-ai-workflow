import type { GitEvidence, SentinelConfig } from '../types.js';
import { GitClient } from './git-client.js';

export async function collectGitEvidence(
  git: GitClient,
  config: SentinelConfig,
): Promise<GitEvidence> {
  const stableSha = await git.resolveRef(config.stable.ref);
  const candidateSha = await git.resolveRef(config.candidate.ref);
  const [mergeBase, stableIsAncestor, status] = await Promise.all([
    git.mergeBase(stableSha, candidateSha),
    git.isAncestor(stableSha, candidateSha),
    git.statusPorcelain(),
  ]);
  return {
    stableRef: config.stable.ref,
    stableSha,
    candidateRef: config.candidate.ref,
    candidateSha,
    mergeBase,
    stableIsAncestor,
    workingTreeClean: status.length === 0,
  };
}
