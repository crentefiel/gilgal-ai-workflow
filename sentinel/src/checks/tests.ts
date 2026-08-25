import type { CheckResult, CommandCheckConfig } from '../types.js';
import { runCustomCommandCheck } from './custom-command.js';

export function runTests(config: CommandCheckConfig, context: Parameters<typeof runCustomCommandCheck>[2]): Promise<CheckResult> {
  return runCustomCommandCheck('tests', config, context);
}
