import type { CheckResult, SentinelReport } from '../types.js';

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function resultTable(results: Array<Pick<CheckResult, 'id' | 'name' | 'status' | 'critical' | 'summary'>>): string {
  if (results.length === 0) return '_None configured._';
  return [
    '| ID | Name | Critical | Status | Summary |',
    '| --- | --- | --- | --- | --- |',
    ...results.map((result) =>
      `| ${cell(result.id)} | ${cell(result.name)} | ${result.critical ? 'yes' : 'no'} | ${result.status} | ${cell(result.summary ?? '')} |`,
    ),
  ].join('\n');
}

export function renderMarkdownReport(report: SentinelReport): string {
  const regressionText = report.regressions.length === 0
    ? 'None detected.'
    : report.regressions
      .map((item) => `- ${item.contractId}: ${item.stableResult} → ${item.candidateResult}${item.critical ? ' (critical)' : ''}`)
      .join('\n');
  const regularContracts = report.contracts.filter((item) => item.type !== 'replay');
  const replayContracts = report.contracts.filter((item) => item.type === 'replay');
  const replay = report.regressionReplay ?? {
    total: replayContracts.length,
    pass: replayContracts.filter((item) => item.status === 'PASS').length,
    fail: replayContracts.filter((item) => item.status === 'FAIL').length,
    pending: replayContracts.filter((item) => item.status === 'PENDING').length,
    error: replayContracts.filter((item) => item.status === 'ERROR').length,
    skipped: replayContracts.filter((item) => item.status === 'SKIPPED').length,
  };
  const replaySummary = replay.total === 0
    ? 'No replay contracts configured.'
    : `${replay.pass} PASS / ${replay.fail} FAIL / ${replay.pending} PENDING / ${replay.error} ERROR / ${replay.skipped} SKIPPED`;

  return `# GILGAL SENTINEL REPORT

Sentinel implementation: **${report.sentinelVersion}**

Generated: ${report.timestamp}

## Git evidence

- Stable: \`${report.stable.ref}\` → \`${report.stable.sha}\`
- Candidate: \`${report.candidate.ref}\` → \`${report.candidate.sha}\`
- Merge base: \`${report.git.mergeBase || 'none'}\`
- Stable is ancestor: ${report.git.stableIsAncestor ? 'yes' : 'no'}
- Working tree clean: ${report.git.workingTreeClean ? 'yes' : 'no'}
- Changed files: ${report.diff.changedFiles.length}
- Added / modified / deleted: ${report.diff.filesAdded} / ${report.diff.filesModified} / ${report.diff.filesDeleted}
- Insertions / deletions: ${report.diff.insertions} / ${report.diff.deletions}

## Automated checks

${resultTable(report.checks)}

## Contracts

${resultTable(regularContracts)}

## Regression Replay

${replaySummary}

${resultTable(replayContracts)}

## Regressions

${regressionText}

## Gate

**${report.gate.status} (${report.gate.outcome})**

${report.gate.reason}
`;
}
