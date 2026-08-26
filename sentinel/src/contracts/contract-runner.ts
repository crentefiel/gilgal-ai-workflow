import type {
  ApprovalState,
  BaselineDocument,
  CheckResult,
  Contract,
  ContractResult,
  SentinelConfig,
} from '../types.js';
import { runCustomCommandCheck } from '../checks/custom-command.js';

function manualResult(
  contract: Contract & { type: 'manual' },
  approvals: ApprovalState,
  baseline: BaselineDocument,
  stableSha: string,
  candidateSha: string,
): ContractResult {
  const now = new Date().toISOString();
  const approval = approvals.approvals.find((item) => item.contractId === contract.id);
  const valid = approval?.candidateSha === candidateSha && approval.stableSha === stableSha && approval.status === 'PASS';
  const approvalState = valid ? 'VALID' : approval ? 'STALE' : 'MISSING';
  const candidateResult = valid ? 'PASS' : 'PENDING';
  const stableResult = baseline.contracts[contract.id] ?? 'NOT_RECORDED';
  return {
    id: contract.id,
    name: contract.name,
    type: 'manual',
    critical: contract.critical,
    status: candidateResult,
    candidateResult,
    stableResult,
    regression: false,
    approvalState,
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
    summary: valid
      ? 'Human approval matches the current STABLE and CANDIDATE SHAs.'
      : approvalState === 'STALE'
        ? 'Previous human approval is stale because a Git SHA changed.'
        : 'Human approval is required.',
  };
}

function executableResult(
  contract: Exclude<Contract, { type: 'manual' }>,
  result: CheckResult,
  baseline: BaselineDocument,
): ContractResult {
  const stableResult = baseline.contracts[contract.id] ?? 'NOT_RECORDED';
  const output: ContractResult = {
    ...result,
    id: contract.id,
    name: contract.name,
    type: contract.type,
    critical: contract.critical,
    candidateResult: result.status,
    stableResult,
    regression: stableResult === 'PASS' && result.status === 'FAIL',
  };
  if (contract.type === 'replay') {
    if (contract.origin !== undefined) output.replayOrigin = contract.origin;
    if (contract.description !== undefined) output.replayDescription = contract.description;
  }
  return output;
}

export async function runContracts(
  contracts: Contract[],
  config: SentinelConfig,
  projectRoot: string,
  approvals: ApprovalState,
  baseline: BaselineDocument,
  stableSha: string,
  candidateSha: string,
  signal?: AbortSignal,
): Promise<ContractResult[]> {
  const results: ContractResult[] = [];
  for (const contract of contracts) {
    if (signal?.aborted) break;
    if (contract.type === 'manual') {
      results.push(manualResult(contract, approvals, baseline, stableSha, candidateSha));
      continue;
    }
    const checkConfig: Parameters<typeof runCustomCommandCheck>[1] = {
      enabled: true,
      command: contract.command,
      critical: contract.critical,
    };
    if (contract.timeoutMs !== undefined) checkConfig.timeoutMs = contract.timeoutMs;
    if (contract.outputLimitBytes !== undefined) checkConfig.outputLimitBytes = contract.outputLimitBytes;
    const check = await runCustomCommandCheck(
      contract.id,
      checkConfig,
      {
        projectRoot,
        defaultTimeoutMs: config.defaults.timeoutMs,
        defaultOutputLimitBytes: config.defaults.outputLimitBytes,
        ...(signal ? { signal } : {}),
      },
    );
    results.push(executableResult(contract, check, baseline));
  }
  return results;
}
