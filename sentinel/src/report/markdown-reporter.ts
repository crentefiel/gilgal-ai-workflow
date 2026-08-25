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

${resultTable(report.contracts)}

## Regressions

${regressionText}

## Gate

**${report.gate.status} (${report.gate.outcome})**

${report.gate.reason}
`;
}
