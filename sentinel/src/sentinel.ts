import { InterruptedError } from './errors.js';
import { runChecks } from './runner/check-runner.js';
import { loadContracts } from './contracts/contract-loader.js';
import { loadBaseline } from './contracts/baseline.js';
import { runContracts } from './contracts/contract-runner.js';
import { StateStore } from './state/state-store.js';
import { GitClient } from './git/git-client.js';
import { collectGitEvidence } from './git/evidence.js';
import { calculateDiff, getFullDiff } from './git/diff.js';
import { evaluateGate } from './gate.js';
import { SENTINEL_VERSION } from './version.js';
import { writeReports, type WrittenReports } from './report/reporter.js';
import type { CheckResult, Regression, SentinelConfig, SentinelReport } from './types.js';

function gitValidationResults(config: SentinelConfig, stableIsAncestor: boolean, workingTreeClean: boolean): CheckResult[] {
  const now = new Date().toISOString();
  const results: CheckResult[] = [];
  if (config.git.requireStableAncestor && !stableIsAncestor) {
    results.push({
      id: 'git-ancestry',
      name: 'Git ancestry',
      status: 'ERROR',
      critical: true,
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      summary: 'CANDIDATE is not descended from the configured STABLE ref.',
    });
  }
  if (config.git.requireCleanWorkingTree && !workingTreeClean) {
    results.push({
      id: 'git-working-tree',
      name: 'Git working tree',
      status: 'ERROR',
      critical: true,
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      summary: 'Working tree is dirty; uncommitted code cannot be bound to a candidate SHA.',
    });
  }
  return results;
}

function summarize(report: Pick<SentinelReport, 'checks' | 'contracts'>): SentinelReport['summary'] {
  const results = [...report.checks, ...report.contracts];
  return {
    pass: results.filter((item) => item.status === 'PASS').length,
    fail: results.filter((item) => item.status === 'FAIL').length,
    pending: results.filter((item) => item.status === 'PENDING').length,
    error: results.filter((item) => item.status === 'ERROR').length,
    skipped: results.filter((item) => item.status === 'SKIPPED').length,
  };
}

export async function runSentinelCheck(
  config: SentinelConfig,
  projectRoot: string,
  signal?: AbortSignal,
): Promise<{ report: SentinelReport; written: WrittenReports }> {
  const git = new GitClient(projectRoot);
  const evidence = await collectGitEvidence(git, config);
  const diff = await calculateDiff(git, evidence.stableSha, evidence.candidateSha);
  const gitChecks = gitValidationResults(config, evidence.stableIsAncestor, evidence.workingTreeClean);
  let checks: CheckResult[] = gitChecks;
  let contracts: SentinelReport['contracts'] = [];

  if (gitChecks.length === 0) {
    checks = await runChecks(config, projectRoot, signal);
    if (signal?.aborted) throw new InterruptedError();
    const contractsDocument = await loadContracts(projectRoot, config.contractsFile);
    const state = new StateStore(projectRoot, config.stateDirectory);
    const [approvals, baseline] = await Promise.all([
      state.loadApprovals(),
      loadBaseline(projectRoot, config.baselinesDirectory, evidence.stableSha),
    ]);
    contracts = await runContracts(
      contractsDocument.contracts,
      config,
      projectRoot,
      approvals,
      baseline,
      evidence.stableSha,
      evidence.candidateSha,
      signal,
    );
    if (signal?.aborted) throw new InterruptedError();
  }

  const regressions: Regression[] = contracts
    .filter((item) => item.regression)
    .map((item) => ({
      contractId: item.id,
      name: item.name,
      critical: item.critical,
      stableResult: item.stableResult,
      candidateResult: item.candidateResult,
    }));
  const gate = evaluateGate(checks, contracts, regressions, config.gate);
  const report: SentinelReport = {
    sentinelVersion: SENTINEL_VERSION,
    timestamp: new Date().toISOString(),
    stable: { ref: evidence.stableRef, sha: evidence.stableSha },
    candidate: { ref: evidence.candidateRef, sha: evidence.candidateSha },
    git: {
      mergeBase: evidence.mergeBase,
      stableIsAncestor: evidence.stableIsAncestor,
      workingTreeClean: evidence.workingTreeClean,
    },
    diff,
    checks,
    contracts,
    regressions,
    summary: { pass: 0, fail: 0, pending: 0, error: 0, skipped: 0 },
    gate,
  };
  report.summary = summarize(report);
  const fullDiff = config.reports.includeDiff
    ? await getFullDiff(git, evidence.stableSha, evidence.candidateSha)
    : undefined;
  const written = await writeReports(report, config, projectRoot, fullDiff);
  await new StateStore(projectRoot, config.stateDirectory).saveLastReport(report);
  return { report, written };
}
