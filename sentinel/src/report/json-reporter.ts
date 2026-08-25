import type { SentinelReport } from '../types.js';

export function renderJsonReport(report: SentinelReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
