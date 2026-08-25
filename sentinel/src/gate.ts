import type { CheckResult, ContractResult, GateResult, Regression, SentinelConfig } from './types.js';

export function evaluateGate(
  checks: CheckResult[],
  contracts: ContractResult[],
  regressions: Regression[],
  gateConfig: SentinelConfig['gate'],
): GateResult {
  const criticalRegression = regressions.find((item) => item.critical);
  if (criticalRegression) {
    return {
      status: 'BLOCKED',
      outcome: 'FAIL',
      reason: `Critical regression detected in contract ${criticalRegression.contractId}.`,
      exitCode: 1,
    };
  }

  const results = [...checks, ...contracts];
  const criticalFailure = results.find(
    (item) => item.critical && (item.status === 'FAIL' || item.status === 'ERROR'),
  );
  if (criticalFailure) {
    return {
      status: 'BLOCKED',
      outcome: 'FAIL',
      reason: `Critical ${contracts.includes(criticalFailure as ContractResult) ? 'contract' : 'check'} ${criticalFailure.id} is ${criticalFailure.status}.`,
      exitCode: 1,
    };
  }

  const nonCriticalFailure = gateConfig.blockOnNonCriticalFailure
    ? results.find((item) => !item.critical && (item.status === 'FAIL' || item.status === 'ERROR'))
    : undefined;
  if (nonCriticalFailure) {
    return {
      status: 'BLOCKED',
      outcome: 'FAIL',
      reason: `Non-critical result ${nonCriticalFailure.id} is ${nonCriticalFailure.status}, and policy blocks it.`,
      exitCode: 1,
    };
  }

  const criticalPending = results.find((item) => item.critical && item.status === 'PENDING');
  if (criticalPending) {
    return {
      status: 'BLOCKED',
      outcome: 'PENDING',
      reason: `Critical contract or check ${criticalPending.id} is PENDING.`,
      exitCode: 2,
    };
  }

  return {
    status: 'READY',
    outcome: 'PASS',
    reason: 'All configured critical evidence passed or was explicitly skipped.',
    exitCode: 0,
  };
}
