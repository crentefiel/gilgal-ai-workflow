import type { ChangeBudgetConfig, CheckResult, DiffSummary } from '../types.js';

interface BudgetMeasurement {
  label: string;
  actual: number;
  limit: number;
}

function measurements(diff: DiffSummary, config: ChangeBudgetConfig): BudgetMeasurement[] {
  const values: BudgetMeasurement[] = [];
  if (config.maxFiles !== undefined) {
    values.push({ label: 'files', actual: diff.changedFiles.length, limit: config.maxFiles });
  }
  if (config.maxInsertions !== undefined) {
    values.push({ label: 'insertions', actual: diff.insertions, limit: config.maxInsertions });
  }
  if (config.maxDeletions !== undefined) {
    values.push({ label: 'deletions', actual: diff.deletions, limit: config.maxDeletions });
  }
  if (config.maxChangedLines !== undefined) {
    values.push({
      label: 'changed lines',
      actual: diff.insertions + diff.deletions,
      limit: config.maxChangedLines,
    });
  }
  return values;
}

export function evaluateChangeBudget(diff: DiffSummary, config: ChangeBudgetConfig): CheckResult | undefined {
  if (!config.enabled) return undefined;

  const startedAt = new Date().toISOString();
  const values = measurements(diff, config);
  const exceeded = values.filter((item) => item.actual > item.limit);
  const finishedAt = new Date().toISOString();

  if (values.length === 0) {
    return {
      id: 'change-budget',
      name: 'Change budget',
      status: 'ERROR',
      critical: config.critical,
      startedAt,
      finishedAt,
      durationMs: 0,
      summary: 'Change Budget is enabled but no limits are configured.',
    };
  }

  const observed = values.map((item) => `${item.label} ${item.actual}/${item.limit}`).join(', ');
  const violations = exceeded.map((item) => `${item.label} ${item.actual} > ${item.limit}`).join('; ');

  return {
    id: 'change-budget',
    name: 'Change budget',
    status: exceeded.length === 0 ? 'PASS' : 'FAIL',
    critical: config.critical,
    startedAt,
    finishedAt,
    durationMs: 0,
    summary: exceeded.length === 0
      ? `Change stays within the configured budget: ${observed}.`
      : `SCOPE EXPANSION DETECTED: ${violations}. Observed: ${observed}.`,
  };
}
