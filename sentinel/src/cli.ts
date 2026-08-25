#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { ConfigurationError, InterruptedError } from './errors.js';
import { runSentinelCheck } from './sentinel.js';
import { loadContracts } from './contracts/contract-loader.js';
import { approveManualContract, findManualContract } from './contracts/manual-approval.js';
import { StateStore } from './state/state-store.js';
import { collectGitEvidence } from './git/evidence.js';
import { GitClient } from './git/git-client.js';
import { renderStatus } from './status.js';
import { renderJsonReport } from './report/json-reporter.js';
import { renderMarkdownReport } from './report/markdown-reporter.js';
import { SENTINEL_VERSION } from './version.js';

const HELP = `GILGAL Sentinel ${SENTINEL_VERSION}

Usage:
  gilgal sentinel check [--config <path>]
  gilgal sentinel status [--config <path>]
  gilgal sentinel report [--json] [--config <path>]
  gilgal sentinel approve <contract-id> [--config <path>]
  gilgal sentinel revoke <contract-id> [--config <path>]
  gilgal sentinel reset [--yes] [--config <path>]

Exit codes for check:
  0 READY / PASS
  1 BLOCKED / FAIL
  2 BLOCKED / PENDING
  3 CONFIGURATION ERROR
  4 INTERNAL ERROR
`;

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new ConfigurationError(`${name} requires a value.`);
  return value;
}

function positionalArgs(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--config') {
      index += 1;
      continue;
    }
    if (!args[index]!.startsWith('--')) values.push(args[index]!);
  }
  return values;
}

async function confirmReset(): Promise<boolean> {
  if (!input.isTTY) {
    throw new ConfigurationError('reset requires --yes in a non-interactive environment.');
  }
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question('Remove local Sentinel approvals and last status? Type "reset" to confirm: ');
    return answer.trim().toLowerCase() === 'reset';
  } finally {
    prompt.close();
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = argv[0] === 'sentinel' ? argv.slice(1) : argv;
  const positions = positionalArgs(args);
  const command = positions[0] ?? (args.includes('--version') ? '--version' : args.includes('--help') || args.includes('-h') ? '--help' : 'help');
  if (command === 'help' || command === '--help' || command === '-h') {
    output.write(HELP);
    return 0;
  }
  if (command === '--version' || command === 'version') {
    output.write(`${SENTINEL_VERSION}\n`);
    return 0;
  }

  const configPath = optionValue(args, '--config') ?? 'gilgal.sentinel.json';
  const loaded = await loadConfig(configPath);
  const state = new StateStore(loaded.projectRoot, loaded.config.stateDirectory);

  if (command === 'check') {
    const controller = new AbortController();
    const interrupt = (): void => controller.abort();
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    try {
      const { report, written } = await runSentinelCheck(loaded.config, loaded.projectRoot, controller.signal);
      output.write(`${renderStatus({
        stableRef: report.stable.ref,
        stableSha: report.stable.sha,
        candidateRef: report.candidate.ref,
        candidateSha: report.candidate.sha,
        mergeBase: report.git.mergeBase,
        stableIsAncestor: report.git.stableIsAncestor,
        workingTreeClean: report.git.workingTreeClean,
      }, report)}`);
      for (const [format, file] of Object.entries(written)) output.write(`${format} report: ${file}\n`);
      return report.gate.exitCode;
    } finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
  }

  if (command === 'status') {
    const evidence = await collectGitEvidence(new GitClient(loaded.projectRoot), loaded.config);
    output.write(renderStatus(evidence, await state.loadLastReport()));
    return 0;
  }

  if (command === 'report') {
    const report = await state.loadLastReport();
    if (!report) throw new ConfigurationError('No Sentinel report has been recorded. Run check first.');
    output.write(args.includes('--json') ? renderJsonReport(report) : renderMarkdownReport(report));
    return 0;
  }

  if (command === 'approve') {
    const contractId = positions[1];
    if (!contractId) throw new ConfigurationError('approve requires a contract id.');
    const contracts = await loadContracts(loaded.projectRoot, loaded.config.contractsFile);
    const approval = await approveManualContract(
      loaded.config,
      loaded.projectRoot,
      contracts.contracts,
      contractId,
    );
    output.write(`Human approval recorded for ${approval.contractId}.\nCandidate SHA: ${approval.candidateSha}\n`);
    return 0;
  }

  if (command === 'revoke') {
    const contractId = positions[1];
    if (!contractId) throw new ConfigurationError('revoke requires a contract id.');
    const contracts = await loadContracts(loaded.projectRoot, loaded.config.contractsFile);
    findManualContract(contracts.contracts, contractId);
    const removed = await state.revokeApproval(contractId);
    output.write(removed ? `Approval revoked for ${contractId}.\n` : `No approval was recorded for ${contractId}.\n`);
    return 0;
  }

  if (command === 'reset') {
    const confirmed = args.includes('--yes') || await confirmReset();
    if (!confirmed) {
      output.write('Reset cancelled.\n');
      return 0;
    }
    await state.reset();
    output.write('Local Sentinel state, approvals, and last status were removed. Project code and Git were untouched.\n');
    return 0;
  }

  throw new ConfigurationError(`Unknown command: ${command}\n\n${HELP}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`GILGAL Sentinel: ${message}\n`);
      if (error instanceof InterruptedError) process.exitCode = error.exitCode;
      else if (error instanceof ConfigurationError) process.exitCode = error.exitCode;
      else process.exitCode = 4;
    },
  );
}
