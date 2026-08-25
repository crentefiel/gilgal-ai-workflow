import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveProjectPath } from '../config.js';
import { ConfigurationError } from '../errors.js';
import type { BaselineDocument, BaselineStatus } from '../types.js';

const VALID_STATUSES = new Set<BaselineStatus>(['PASS', 'FAIL', 'PENDING', 'NOT_RECORDED']);

export async function loadBaseline(
  projectRoot: string,
  baselinesDirectory: string,
  stableSha: string,
): Promise<BaselineDocument> {
  const directory = resolveProjectPath(projectRoot, baselinesDirectory, 'baselinesDirectory');
  const file = path.join(directory, `${stableSha}.json`);
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as BaselineDocument;
    if (parsed.stableSha !== stableSha || typeof parsed.contracts !== 'object' || parsed.contracts === null) {
      throw new ConfigurationError(`Baseline does not match stable SHA ${stableSha}.`);
    }
    for (const [id, status] of Object.entries(parsed.contracts)) {
      if (!VALID_STATUSES.has(status)) throw new ConfigurationError(`Invalid baseline status for contract ${id}.`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { stableSha, contracts: {} };
    }
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(`Cannot load baseline ${file}.`, { cause: error });
  }
}
