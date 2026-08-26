import { readFile } from 'node:fs/promises';
import { ConfigurationError } from '../errors.js';
import { resolveProjectPath } from '../config.js';
import type { CommandContract, Contract, ContractsDocument, ReplayContract } from '../types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(raw: UnknownRecord, key: string, context: string): string | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigurationError(`${context}.${key} must be a non-empty string when provided.`);
  }
  return value;
}

export async function loadContracts(projectRoot: string, contractsFile: string): Promise<ContractsDocument> {
  const absolutePath = resolveProjectPath(projectRoot, contractsFile, 'contractsFile');
  let document: unknown;
  try {
    document = JSON.parse(await readFile(absolutePath, 'utf8'));
  } catch (error) {
    throw new ConfigurationError(`Cannot load contracts file: ${absolutePath}`, { cause: error });
  }
  if (!isRecord(document) || document.version !== 1 || !Array.isArray(document.contracts)) {
    throw new ConfigurationError('Contracts file must contain version 1 and a contracts array.');
  }

  const ids = new Set<string>();
  const contracts: Contract[] = document.contracts.map((raw, index) => {
    if (!isRecord(raw)) throw new ConfigurationError(`contracts[${index}] must be an object.`);
    const { id, name, type } = raw;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) {
      throw new ConfigurationError(`contracts[${index}].id is invalid.`);
    }
    if (ids.has(id)) throw new ConfigurationError(`Duplicate contract id: ${id}`);
    ids.add(id);
    if (typeof name !== 'string' || name.trim() === '') {
      throw new ConfigurationError(`contracts[${index}].name is required.`);
    }
    if (type !== 'command' && type !== 'manual' && type !== 'replay') {
      throw new ConfigurationError(`contracts[${index}].type must be command, manual, or replay.`);
    }
    if (raw.critical !== undefined && typeof raw.critical !== 'boolean') {
      throw new ConfigurationError(`contracts[${index}].critical must be a boolean.`);
    }
    const critical = raw.critical ?? true;
    if (type === 'manual') return { id, name, type, critical };
    if (typeof raw.command !== 'string' || raw.command.trim() === '') {
      throw new ConfigurationError(`contracts[${index}].command is required.`);
    }

    const contract: CommandContract | ReplayContract = type === 'replay'
      ? { id, name, type, critical, command: raw.command }
      : { id, name, type, critical, command: raw.command };

    if (raw.timeoutMs !== undefined) {
      if (!Number.isInteger(raw.timeoutMs) || (raw.timeoutMs as number) <= 0) {
        throw new ConfigurationError(`contracts[${index}].timeoutMs must be a positive integer.`);
      }
      contract.timeoutMs = raw.timeoutMs as number;
    }
    if (raw.outputLimitBytes !== undefined) {
      if (!Number.isInteger(raw.outputLimitBytes) || (raw.outputLimitBytes as number) <= 0) {
        throw new ConfigurationError(`contracts[${index}].outputLimitBytes must be a positive integer.`);
      }
      contract.outputLimitBytes = raw.outputLimitBytes as number;
    }
    if (type === 'replay') {
      const origin = optionalText(raw, 'origin', `contracts[${index}]`);
      const description = optionalText(raw, 'description', `contracts[${index}]`);
      if (origin !== undefined) contract.origin = origin;
      if (description !== undefined) contract.description = description;
    }
    return contract;
  });
  return { version: 1, contracts };
}
