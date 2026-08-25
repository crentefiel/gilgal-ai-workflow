import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveProjectPath } from '../config.js';
import type { SentinelConfig, SentinelReport } from '../types.js';
import { renderJsonReport } from './json-reporter.js';
import { renderMarkdownReport } from './markdown-reporter.js';

export interface WrittenReports {
  json?: string;
  markdown?: string;
  diff?: string;
}

export async function writeReports(
  report: SentinelReport,
  config: SentinelConfig,
  projectRoot: string,
  fullDiff?: string,
): Promise<WrittenReports> {
  const directory = resolveProjectPath(projectRoot, config.reports.directory, 'reports.directory');
  await mkdir(directory, { recursive: true });
  const timestamp = report.timestamp.replace(/[:.]/g, '-');
  const baseName = `sentinel-${timestamp}`;
  const written: WrittenReports = {};
  if (config.reports.json) {
    written.json = path.join(directory, `${baseName}.json`);
    await writeFile(written.json, renderJsonReport(report), 'utf8');
  }
  if (config.reports.markdown) {
    written.markdown = path.join(directory, `${baseName}.md`);
    await writeFile(written.markdown, renderMarkdownReport(report), 'utf8');
  }
  if (config.reports.includeDiff && fullDiff !== undefined) {
    written.diff = path.join(directory, `${baseName}.diff`);
    await writeFile(written.diff, fullDiff, 'utf8');
  }
  return written;
}
