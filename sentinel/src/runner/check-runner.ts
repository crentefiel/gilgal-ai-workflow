import type { CheckResult, SentinelConfig } from '../types.js';
import { runBuild } from '../checks/build.js';
import { runCustomCommandCheck } from '../checks/custom-command.js';
import { runTests } from '../checks/tests.js';
import { runTypecheck } from '../checks/typecheck.js';

export async function runChecks(
  config: SentinelConfig,
  projectRoot: string,
  signal?: AbortSignal,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const context = {
    projectRoot,
    defaultTimeoutMs: config.defaults.timeoutMs,
    defaultOutputLimitBytes: config.defaults.outputLimitBytes,
    ...(signal ? { signal } : {}),
  };

  for (const [id, check] of Object.entries(config.checks)) {
    if (signal?.aborted) break;
    if (id === 'typecheck') results.push(await runTypecheck(check, context));
    else if (id === 'tests') results.push(await runTests(check, context));
    else if (id === 'build') results.push(await runBuild(check, context));
    else results.push(await runCustomCommandCheck(id, check, context));
  }
  return results;
}
