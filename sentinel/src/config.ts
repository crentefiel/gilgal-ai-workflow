import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ConfigurationError } from './errors.js';
import type { CommandCheckConfig, SentinelConfig } from './types.js';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 50 * 1024;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(parent: UnknownRecord, key: string, context: string): string {
  const value = parent[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigurationError(`${context}.${key} must be a non-empty string.`);
  }
  return value;
}

function optionalBoolean(parent: UnknownRecord, key: string, fallback: boolean): boolean {
  const value = parent[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new ConfigurationError(`${key} must be a boolean.`);
  }
  return value;
}

function optionalPositiveInteger(parent: UnknownRecord, key: string, fallback: number): number {
  const value = parent[key];
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ConfigurationError(`${key} must be a positive integer.`);
  }
  return value as number;
}

function parseChecks(value: unknown): Record<string, CommandCheckConfig> {
  if (!isRecord(value)) {
    throw new ConfigurationError('checks must be an object.');
  }

  const checks: Record<string, CommandCheckConfig> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) || !isRecord(raw)) {
      throw new ConfigurationError(`checks.${id} is invalid.`);
    }
    const enabled = optionalBoolean(raw, 'enabled', true);
    const command = raw.command;
    if (enabled && (typeof command !== 'string' || command.trim() === '')) {
      throw new ConfigurationError(`checks.${id}.command is required when enabled.`);
    }
    if (command !== undefined && typeof command !== 'string') {
      throw new ConfigurationError(`checks.${id}.command must be a string.`);
    }
    const parsed: CommandCheckConfig = {
      enabled,
      critical: optionalBoolean(raw, 'critical', true),
    };
    if (typeof command === 'string') parsed.command = command;
    if (raw.timeoutMs !== undefined) {
      parsed.timeoutMs = optionalPositiveInteger(raw, 'timeoutMs', DEFAULT_TIMEOUT_MS);
    }
    if (raw.outputLimitBytes !== undefined) {
      parsed.outputLimitBytes = optionalPositiveInteger(raw, 'outputLimitBytes', DEFAULT_OUTPUT_LIMIT_BYTES);
    }
    checks[id] = parsed;
  }
  return checks;
}

export function resolveProjectPath(projectRoot: string, configuredPath: string, label: string): string {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, configuredPath);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new ConfigurationError(`${label} must stay inside the project root.`);
  }
  if (relative === '.git' || relative.startsWith(`.git${path.sep}`)) {
    throw new ConfigurationError(`${label} must not point into Git metadata.`);
  }
  return resolved;
}

export async function loadConfig(configPath = 'gilgal.sentinel.json', cwd = process.cwd()): Promise<{
  config: SentinelConfig;
  configPath: string;
  projectRoot: string;
}> {
  const absoluteConfigPath = path.resolve(cwd, configPath);
  let rawText: string;
  try {
    rawText = await readFile(absoluteConfigPath, 'utf8');
  } catch (error) {
    throw new ConfigurationError(`Configuration file not found: ${absoluteConfigPath}`, { cause: error });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch (error) {
    throw new ConfigurationError(`Invalid JSON in ${absoluteConfigPath}.`, { cause: error });
  }
  if (!isRecord(raw)) throw new ConfigurationError('Configuration root must be an object.');
  if (raw.version !== 1) throw new ConfigurationError('Configuration version must be 1.');
  if (!isRecord(raw.stable)) throw new ConfigurationError('stable is required.');
  if (!isRecord(raw.candidate)) throw new ConfigurationError('candidate is required.');

  const reportsRaw = raw.reports === undefined ? {} : raw.reports;
  const defaultsRaw = raw.defaults === undefined ? {} : raw.defaults;
  const gitRaw = raw.git === undefined ? {} : raw.git;
  const gateRaw = raw.gate === undefined ? {} : raw.gate;
  if (!isRecord(reportsRaw) || !isRecord(defaultsRaw) || !isRecord(gitRaw) || !isRecord(gateRaw)) {
    throw new ConfigurationError('reports, defaults, git, and gate must be objects.');
  }
  if (gitRaw.requireStableAncestor === false) {
    throw new ConfigurationError('git.requireStableAncestor cannot be disabled; candidate ancestry is a Sentinel invariant.');
  }

  const projectRoot = path.dirname(absoluteConfigPath);
  const reportsDirectory = typeof reportsRaw.directory === 'string' ? reportsRaw.directory : '.gilgal/reports';
  const contractsFile = requiredString(raw, 'contractsFile', 'configuration');
  const stateDirectory = typeof raw.stateDirectory === 'string' ? raw.stateDirectory : '.gilgal/state';
  const baselinesDirectory = typeof raw.baselinesDirectory === 'string' ? raw.baselinesDirectory : '.gilgal/baselines';

  resolveProjectPath(projectRoot, reportsDirectory, 'reports.directory');
  resolveProjectPath(projectRoot, contractsFile, 'contractsFile');
  const resolvedStateDirectory = resolveProjectPath(projectRoot, stateDirectory, 'stateDirectory');
  if (resolvedStateDirectory === path.resolve(projectRoot)) {
    throw new ConfigurationError('stateDirectory must be a subdirectory, not the project root.');
  }
  resolveProjectPath(projectRoot, baselinesDirectory, 'baselinesDirectory');

  return {
    configPath: absoluteConfigPath,
    projectRoot,
    config: {
      version: 1,
      stable: { ref: requiredString(raw.stable, 'ref', 'stable') },
      candidate: { ref: requiredString(raw.candidate, 'ref', 'candidate') },
      checks: parseChecks(raw.checks ?? {}),
      contractsFile,
      reports: {
        directory: reportsDirectory,
        json: optionalBoolean(reportsRaw, 'json', true),
        markdown: optionalBoolean(reportsRaw, 'markdown', true),
        includeDiff: optionalBoolean(reportsRaw, 'includeDiff', false),
      },
      stateDirectory,
      baselinesDirectory,
      defaults: {
        timeoutMs: optionalPositiveInteger(defaultsRaw, 'timeoutMs', DEFAULT_TIMEOUT_MS),
        outputLimitBytes: optionalPositiveInteger(defaultsRaw, 'outputLimitBytes', DEFAULT_OUTPUT_LIMIT_BYTES),
      },
      git: {
        requireCleanWorkingTree: optionalBoolean(gitRaw, 'requireCleanWorkingTree', true),
        requireStableAncestor: optionalBoolean(gitRaw, 'requireStableAncestor', true),
      },
      gate: {
        blockOnNonCriticalFailure: optionalBoolean(gateRaw, 'blockOnNonCriticalFailure', false),
      },
    },
  };
}
