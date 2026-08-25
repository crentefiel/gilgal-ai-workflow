import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ConfigurationError } from '../errors.js';

const READ_ONLY_GIT_COMMANDS = new Set(['status', 'rev-parse', 'diff', 'merge-base', 'log']);

export interface CommandExecution {
  exitCode?: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  outputTruncated: boolean;
  spawnError?: string;
}

export interface CommandRunOptions {
  cwd: string;
  timeoutMs: number;
  outputLimitBytes: number;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
}

function resolveWindowsNodeShim(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): { executable: string; args: string[]; error?: string } {
  if (process.platform !== 'win32') return { executable, args };
  const extension = path.extname(executable).toLowerCase();
  const pathEntries = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  const candidates = extension
    ? [executable]
    : pathEntries.flatMap((entry) => [
      path.join(entry, `${executable}.exe`),
      path.join(entry, `${executable}.com`),
      path.join(entry, `${executable}.cmd`),
      path.join(entry, `${executable}.bat`),
    ]);
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved || !['.cmd', '.bat'].includes(path.extname(resolved).toLowerCase())) {
    return { executable: resolved ?? executable, args };
  }

  // npm/corepack-generated Windows shims contain one literal JS entry point.
  // Resolve that file and launch Node directly so no command shell is involved.
  const shim = readFileSync(resolved, 'utf8');
  const directMatch = /["']%dp0%[\\/]([^"']+\.(?:c?js|mjs))["']\s+%\*/i.exec(shim)?.[1];
  const assignedMatches = [...shim.matchAll(/%~dp0[\\/]([^"\r\n]+\.(?:c?js|mjs))/gi)].map((item) => item[1]!);
  const assignedMatch = [...assignedMatches].reverse().find((item) => /cli\.(?:c?js|mjs)$/i.test(item))
    ?? assignedMatches.at(-1);
  const entry = directMatch ?? assignedMatch;
  if (!entry) {
    return { executable, args, error: `Windows batch command ${resolved} is not a supported Node shim; configure an executable directly.` };
  }
  const shimRoot = path.dirname(resolved);
  const entryPoint = path.resolve(shimRoot, entry.replace(/[\\/]/g, path.sep));
  const relative = path.relative(shimRoot, entryPoint);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || !existsSync(entryPoint)) {
    return { executable, args, error: `Windows Node shim ${resolved} points outside its installation or is incomplete.` };
  }
  return { executable: process.execPath, args: [entryPoint, ...args] };
}

class TailBuffer {
  private value: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  truncated = false;

  constructor(private readonly limit: number) {}

  append(chunk: Buffer | string): void {
    const incoming = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (incoming.length >= this.limit) {
      this.value = incoming.subarray(incoming.length - this.limit);
      this.truncated = true;
      return;
    }
    const combined = Buffer.concat([this.value, incoming]);
    if (combined.length > this.limit) {
      this.value = combined.subarray(combined.length - this.limit);
      this.truncated = true;
    } else {
      this.value = combined;
    }
  }

  toString(): string {
    return this.value.toString('utf8');
  }
}

export function parseCommand(command: string): { executable: string; args: string[] } {
  if (command.includes('\0') || /[\r\n]/.test(command)) {
    throw new ConfigurationError('Commands cannot contain NUL or newline characters.');
  }

  const tokens: string[] = [];
  let token = '';
  let quote: 'single' | 'double' | undefined;
  let tokenStarted = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (quote === 'single') {
      if (character === "'") quote = undefined;
      else token += character;
      tokenStarted = true;
      continue;
    }
    if (quote === 'double') {
      if (character === '"') {
        quote = undefined;
      } else if (character === '\\' && index + 1 < command.length && ['"', '\\'].includes(command[index + 1]!)) {
        token += command[index + 1]!;
        index += 1;
      } else {
        token += character;
      }
      tokenStarted = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (tokenStarted) {
        tokens.push(token);
        token = '';
        tokenStarted = false;
      }
    } else if (character === "'") {
      quote = 'single';
      tokenStarted = true;
    } else if (character === '"') {
      quote = 'double';
      tokenStarted = true;
    } else if (character === '\\' && index + 1 < command.length && /[\s'"\\]/.test(command[index + 1]!)) {
      token += command[index + 1]!;
      tokenStarted = true;
      index += 1;
    } else {
      token += character;
      tokenStarted = true;
    }
  }
  if (quote) throw new ConfigurationError('Command contains an unterminated quote.');
  if (tokenStarted) tokens.push(token);
  const [executable, ...args] = tokens;
  if (!executable) throw new ConfigurationError('Command must not be empty.');
  const executableName = path.basename(executable).toLowerCase();
  if (executableName === 'git' || executableName === 'git.exe') {
    const subcommand = args[0];
    if (!subcommand || !READ_ONLY_GIT_COMMANDS.has(subcommand)) {
      throw new ConfigurationError(`Configured Git subcommand is not read-only and is forbidden: ${subcommand ?? '(missing)'}`);
    }
  }
  return { executable, args };
}

export async function runExecutable(
  executable: string,
  args: string[],
  options: CommandRunOptions,
): Promise<CommandExecution> {
  const environment = options.env ?? process.env;
  const resolved = resolveWindowsNodeShim(executable, args, environment);
  if (resolved.error) {
    return {
      stdout: '',
      stderr: '',
      durationMs: 0,
      timedOut: false,
      aborted: false,
      outputTruncated: false,
      spawnError: resolved.error,
    };
  }
  const stdout = new TailBuffer(options.outputLimitBytes);
  const stderr = new TailBuffer(options.outputLimitBytes);
  const startedAt = Date.now();

  return await new Promise<CommandExecution>((resolve) => {
    let timedOut = false;
    let aborted = options.signal?.aborted ?? false;
    let settled = false;
    let spawnError: string | undefined;
    const child = spawn(resolved.executable, resolved.args, {
      cwd: options.cwd,
      env: environment,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => stdout.append(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.append(chunk));
    child.on('error', (error) => {
      spawnError = error.message;
    });

    let hardKill: NodeJS.Timeout | undefined;
    const stopChild = (): void => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform === 'win32' && child.pid !== undefined) {
        const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
        killer.unref();
      } else {
        child.kill('SIGTERM');
      }
      hardKill ??= setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }, 1_000);
    };
    const abortListener = (): void => {
      aborted = true;
      stopChild();
    };
    options.signal?.addEventListener('abort', abortListener, { once: true });
    if (aborted) stopChild();

    const timeout = setTimeout(() => {
      timedOut = true;
      stopChild();
    }, options.timeoutMs);

    const finish = (exitCode?: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (hardKill) clearTimeout(hardKill);
      options.signal?.removeEventListener('abort', abortListener);
      const result: CommandExecution = {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        durationMs: Date.now() - startedAt,
        timedOut,
        aborted,
        outputTruncated: stdout.truncated || stderr.truncated,
      };
      if (exitCode !== undefined) result.exitCode = exitCode;
      if (spawnError !== undefined) result.spawnError = spawnError;
      resolve(result);
    };

    child.on('close', (code) => finish(code ?? undefined));
  });
}

export async function runCommand(command: string, options: CommandRunOptions): Promise<CommandExecution> {
  const { executable, args } = parseCommand(command);
  return runExecutable(executable, args, options);
}
