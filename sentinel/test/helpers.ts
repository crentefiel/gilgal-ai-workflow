import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export async function createGitProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'gilgal-sentinel-'));
  git(directory, 'init');
  git(directory, 'config', 'user.email', 'sentinel@example.invalid');
  git(directory, 'config', 'user.name', 'Sentinel Test');
  await writeFile(path.join(directory, '.gitignore'), '.gilgal/state/\n.gilgal/reports/\n', 'utf8');
  await writeFile(path.join(directory, 'tracked.txt'), 'stable\n', 'utf8');
  await writeFile(path.join(directory, 'removable.txt'), 'stable removable file\n', 'utf8');
  git(directory, 'add', '.');
  git(directory, 'commit', '-m', 'stable');
  return directory;
}

export async function removeProject(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true, maxRetries: 3 });
}

export function nodeCommand(script: string): string {
  const executable = process.execPath.replace(/"/g, '\\"');
  return `"${executable}" -e '${script.replace(/'/g, "\\'")}'`;
}

export async function writeJson(directory: string, name: string, value: unknown): Promise<void> {
  const destination = path.join(directory, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function basicConfig(command = nodeCommand('process.exit(0)')): Record<string, unknown> {
  return {
    version: 1,
    stable: { ref: 'stable-ref' },
    candidate: { ref: 'HEAD' },
    checks: { tests: { enabled: true, command } },
    contractsFile: 'gilgal.contracts.json',
    reports: { directory: '.gilgal/reports', json: true, markdown: true },
    stateDirectory: '.gilgal/state',
    baselinesDirectory: '.gilgal/baselines',
  };
}
