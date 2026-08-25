export type CheckStatus = 'PASS' | 'FAIL' | 'PENDING' | 'SKIPPED' | 'ERROR';
export type BaselineStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_RECORDED';
export type GateStatus = 'READY' | 'BLOCKED';

export interface RefConfig {
  ref: string;
}

export interface CommandCheckConfig {
  enabled: boolean;
  command?: string;
  timeoutMs?: number;
  critical?: boolean;
  outputLimitBytes?: number;
}

export interface ReportsConfig {
  directory: string;
  json: boolean;
  markdown: boolean;
  includeDiff?: boolean;
}

export interface SentinelConfig {
  version: 1;
  stable: RefConfig;
  candidate: RefConfig;
  checks: Record<string, CommandCheckConfig>;
  contractsFile: string;
  reports: ReportsConfig;
  stateDirectory: string;
  baselinesDirectory: string;
  defaults: {
    timeoutMs: number;
    outputLimitBytes: number;
  };
  git: {
    requireCleanWorkingTree: boolean;
    requireStableAncestor: boolean;
  };
  gate: {
    blockOnNonCriticalFailure: boolean;
  };
}

export interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  critical: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode?: number;
  summary?: string;
  stdout?: string;
  stderr?: string;
  outputTruncated?: boolean;
}

export interface CommandContract {
  id: string;
  name: string;
  critical: boolean;
  type: 'command';
  command: string;
  timeoutMs?: number;
  outputLimitBytes?: number;
}

export interface ManualContract {
  id: string;
  name: string;
  critical: boolean;
  type: 'manual';
}

export type Contract = CommandContract | ManualContract;

export interface ContractsDocument {
  version: 1;
  contracts: Contract[];
}

export interface ManualApproval {
  contractId: string;
  status: 'PASS';
  approvedAt: string;
  candidateSha: string;
  stableSha: string;
}

export interface ApprovalState {
  version: 1;
  approvals: ManualApproval[];
}

export interface ContractResult extends CheckResult {
  type: Contract['type'];
  stableResult: BaselineStatus;
  candidateResult: CheckStatus;
  regression: boolean;
  approvalState?: 'VALID' | 'MISSING' | 'STALE';
}

export interface DiffSummary {
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  insertions: number;
  deletions: number;
  changedFiles: string[];
}

export interface GitEvidence {
  stableRef: string;
  stableSha: string;
  candidateRef: string;
  candidateSha: string;
  mergeBase: string;
  stableIsAncestor: boolean;
  workingTreeClean: boolean;
}

export interface Regression {
  contractId: string;
  name: string;
  critical: boolean;
  stableResult: BaselineStatus;
  candidateResult: CheckStatus;
}

export interface GateResult {
  status: GateStatus;
  outcome: 'PASS' | 'FAIL' | 'PENDING';
  reason: string;
  exitCode: 0 | 1 | 2;
}

export interface SentinelReport {
  sentinelVersion: string;
  timestamp: string;
  stable: { ref: string; sha: string };
  candidate: { ref: string; sha: string };
  git: {
    mergeBase: string;
    stableIsAncestor: boolean;
    workingTreeClean: boolean;
  };
  diff: DiffSummary;
  checks: CheckResult[];
  contracts: ContractResult[];
  regressions: Regression[];
  summary: {
    pass: number;
    fail: number;
    pending: number;
    error: number;
    skipped: number;
  };
  gate: GateResult;
}

export interface BaselineDocument {
  stableSha: string;
  contracts: Record<string, BaselineStatus>;
}

export interface SentinelProvider {
  readonly type: string;
  run(contract: Contract, context: ProviderContext): Promise<ContractResult>;
}

export interface ProviderContext {
  projectRoot: string;
  stableSha: string;
  candidateSha: string;
  signal?: AbortSignal;
}
