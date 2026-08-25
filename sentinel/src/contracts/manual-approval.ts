import { ConfigurationError } from '../errors.js';
import { collectGitEvidence } from '../git/evidence.js';
import { GitClient } from '../git/git-client.js';
import { StateStore } from '../state/state-store.js';
import type { Contract, ManualApproval, SentinelConfig } from '../types.js';

export function findManualContract(contracts: Contract[], contractId: string): Contract & { type: 'manual' } {
  const contract = contracts.find((item) => item.id === contractId);
  if (!contract) throw new ConfigurationError(`Unknown contract: ${contractId}`);
  if (contract.type !== 'manual') throw new ConfigurationError(`Contract ${contractId} is not manual.`);
  return contract;
}

export async function approveManualContract(
  config: SentinelConfig,
  projectRoot: string,
  contracts: Contract[],
  contractId: string,
): Promise<ManualApproval> {
  findManualContract(contracts, contractId);
  const evidence = await collectGitEvidence(new GitClient(projectRoot), config);
  if (config.git.requireStableAncestor && !evidence.stableIsAncestor) {
    throw new ConfigurationError('Candidate is not descended from the configured STABLE ref.');
  }
  if (!evidence.workingTreeClean) {
    throw new ConfigurationError('Manual approval requires a clean working tree so the approval is bound to exact code.');
  }
  const approval: ManualApproval = {
    contractId,
    status: 'PASS',
    approvedAt: new Date().toISOString(),
    candidateSha: evidence.candidateSha,
    stableSha: evidence.stableSha,
  };
  await new StateStore(projectRoot, config.stateDirectory).saveApproval(approval);
  return approval;
}
