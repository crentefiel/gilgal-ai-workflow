import type { CheckResult, CommandCheckConfig } from '../types.js';
import { runCustomCommandCheck } from './custom-command.js';

export function runBuild(config: CommandCheckConfig, context: Parameters<typeof runCustomCommandCheck>[2]): Promise<CheckResult> {
  return runCustomCommandCheck('build', config, context);
}
