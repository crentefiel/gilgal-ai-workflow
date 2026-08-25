import type { CheckResult, CommandCheckConfig } from '../types.js';
import { runCommand } from '../runner/command-runner.js';

function titleFromId(id: string): string {
  return id.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function runCustomCommandCheck(
  id: string,
  check: CommandCheckConfig,
  context: {
    projectRoot: string;
    defaultTimeoutMs: number;
    defaultOutputLimitBytes: number;
    signal?: AbortSignal;
  },
): Promise<CheckResult> {
  const startedAt = new Date();
  const critical = check.critical ?? true;
  if (!check.enabled) {
    return {
      id,
      name: titleFromId(id),
      status: 'SKIPPED',
      critical,
      startedAt: startedAt.toISOString(),
      finishedAt: startedAt.toISOString(),
      durationMs: 0,
      summary: 'Disabled by configuration.',
    };
  }

  const execution = await runCommand(check.command!, {
    cwd: context.projectRoot,
    timeoutMs: check.timeoutMs ?? context.defaultTimeoutMs,
    outputLimitBytes: check.outputLimitBytes ?? context.defaultOutputLimitBytes,
    ...(context.signal ? { signal: context.signal } : {}),
  });
  const finishedAt = new Date();
  let status: CheckResult['status'];
  let summary: string;
  if (execution.aborted) {
    status = 'ERROR';
    summary = 'Command was cancelled.';
  } else if (execution.timedOut) {
    status = 'ERROR';
    summary = `Command exceeded its timeout (${check.timeoutMs ?? context.defaultTimeoutMs} ms).`;
  } else if (execution.spawnError) {
    status = 'ERROR';
    summary = `Command could not be started: ${execution.spawnError}`;
  } else if (execution.exitCode === 0) {
    status = 'PASS';
    summary = 'Command exited with code 0.';
  } else {
    status = 'FAIL';
    summary = `Command exited with code ${execution.exitCode ?? 'unknown'}.`;
  }

  const result: CheckResult = {
    id,
    name: titleFromId(id),
    status,
    critical,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: execution.durationMs,
    summary,
    stdout: execution.stdout,
    stderr: execution.stderr,
    outputTruncated: execution.outputTruncated,
  };
  if (execution.exitCode !== undefined) result.exitCode = execution.exitCode;
  return result;
}
