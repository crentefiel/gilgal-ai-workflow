import type { GitEvidence, SentinelReport } from './types.js';

export function renderStatus(evidence: GitEvidence, report?: SentinelReport): string {
  const lines = [
    'GILGAL SENTINEL',
    '',
    `Stable ref: ${evidence.stableRef}`,
    `Stable SHA: ${evidence.stableSha}`,
    `Candidate ref: ${evidence.candidateRef}`,
    `Candidate SHA: ${evidence.candidateSha}`,
    `Working tree: ${evidence.workingTreeClean ? 'CLEAN' : 'DIRTY'}`,
  ];
  if (!report) {
    lines.push('', 'Last result: NOT TESTED', 'Gate: BLOCKED', 'Reason: No Sentinel report has been recorded.');
    return `${lines.join('\n')}\n`;
  }
  lines.push(
    '',
    `Changed files: ${report.diff.changedFiles.length}`,
    `Automated checks: PASS ${report.checks.filter((item) => item.status === 'PASS').length}, FAIL ${report.checks.filter((item) => item.status === 'FAIL').length}, PENDING ${report.checks.filter((item) => item.status === 'PENDING').length}, ERROR ${report.checks.filter((item) => item.status === 'ERROR').length}`,
    `Contracts: PASS ${report.contracts.filter((item) => item.status === 'PASS').length}, FAIL ${report.contracts.filter((item) => item.status === 'FAIL').length}, PENDING ${report.contracts.filter((item) => item.status === 'PENDING').length}, ERROR ${report.contracts.filter((item) => item.status === 'ERROR').length}`,
    `Regressions: ${report.regressions.length}`,
    `Last result: ${report.gate.outcome}`,
    `Gate: ${report.gate.status}`,
    `Reason: ${report.gate.reason}`,
  );
  if (report.candidate.sha !== evidence.candidateSha || report.stable.sha !== evidence.stableSha) {
    lines.push('Warning: the last report is stale for the current Git SHAs.');
  }
  return `${lines.join('\n')}\n`;
}
