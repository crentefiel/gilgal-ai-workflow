import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveProjectPath } from '../config.js';
import { ConfigurationError } from '../errors.js';
import type { ApprovalState, ManualApproval, SentinelReport } from '../types.js';

const EMPTY_APPROVALS: ApprovalState = { version: 1, approvals: [] };

export class StateStore {
  readonly directory: string;

  constructor(projectRoot: string, stateDirectory: string) {
    this.directory = resolveProjectPath(projectRoot, stateDirectory, 'stateDirectory');
    if (this.directory === path.resolve(projectRoot)) {
      throw new ConfigurationError('Refusing to use the project root as the Sentinel state directory.');
    }
  }

  private async atomicWrite(fileName: string, contents: string): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const destination = path.join(this.directory, fileName);
    const temporary = path.join(this.directory, `.${fileName}.${randomUUID()}.tmp`);
    await writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, destination);
  }

  async loadApprovals(): Promise<ApprovalState> {
    try {
      const parsed: unknown = JSON.parse(await readFile(path.join(this.directory, 'approvals.json'), 'utf8'));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('version' in parsed) ||
        parsed.version !== 1 ||
        !('approvals' in parsed) ||
        !Array.isArray(parsed.approvals)
      ) return { ...EMPTY_APPROVALS, approvals: [] };
      return parsed as ApprovalState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_APPROVALS, approvals: [] };
      throw error;
    }
  }

  async saveApproval(approval: ManualApproval): Promise<void> {
    const state = await this.loadApprovals();
    state.approvals = state.approvals.filter((item) => item.contractId !== approval.contractId);
    state.approvals.push(approval);
    await this.atomicWrite('approvals.json', `${JSON.stringify(state, null, 2)}\n`);
  }

  async revokeApproval(contractId: string): Promise<boolean> {
    const state = await this.loadApprovals();
    const approvals = state.approvals.filter((item) => item.contractId !== contractId);
    if (approvals.length === state.approvals.length) return false;
    await this.atomicWrite('approvals.json', `${JSON.stringify({ version: 1, approvals }, null, 2)}\n`);
    return true;
  }

  async saveLastReport(report: SentinelReport): Promise<void> {
    await this.atomicWrite('last-report.json', `${JSON.stringify(report, null, 2)}\n`);
  }

  async loadLastReport(): Promise<SentinelReport | undefined> {
    try {
      return JSON.parse(await readFile(path.join(this.directory, 'last-report.json'), 'utf8')) as SentinelReport;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async reset(): Promise<void> {
    await rm(this.directory, { recursive: true, force: true });
  }
}
