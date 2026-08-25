import { ConfigurationError, InternalError } from '../errors.js';
import { runExecutable } from '../runner/command-runner.js';

const READ_ONLY_GIT_COMMANDS = new Set(['status', 'rev-parse', 'diff', 'merge-base', 'log']);

export class GitClient {
  constructor(private readonly projectRoot: string) {}

  async run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const subcommand = args[0];
    if (!subcommand || !READ_ONLY_GIT_COMMANDS.has(subcommand)) {
      throw new InternalError(`Git subcommand is not allowed by Sentinel: ${subcommand ?? '(missing)'}`);
    }
    const result = await runExecutable('git', args, {
      cwd: this.projectRoot,
      timeoutMs: 30_000,
      outputLimitBytes: 5 * 1024 * 1024,
    });
    if (result.spawnError) throw new InternalError(`Unable to run Git: ${result.spawnError}`);
    if (result.timedOut) throw new InternalError('Git command timed out.');
    if (result.outputTruncated) throw new InternalError('Git output exceeded the safe evidence limit; results would be incomplete.');
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 1 };
  }

  async require(args: string[], description: string): Promise<string> {
    const result = await this.run(args);
    if (result.exitCode !== 0) {
      throw new InternalError(`${description}: ${result.stderr.trim() || `Git exited with ${result.exitCode}`}`);
    }
    return result.stdout.trim();
  }

  async resolveRef(ref: string): Promise<string> {
    const result = await this.run(['rev-parse', '--verify', `${ref}^{commit}`]);
    if (result.exitCode !== 0) {
      throw new ConfigurationError(`Cannot resolve Git ref ${ref}: ${result.stderr.trim() || 'unknown ref'}`);
    }
    return result.stdout.trim();
  }

  async statusPorcelain(): Promise<string> {
    return this.require(['status', '--porcelain=v1', '--untracked-files=normal'], 'Cannot inspect the Git working tree');
  }

  async mergeBase(stableSha: string, candidateSha: string): Promise<string> {
    const result = await this.run(['merge-base', stableSha, candidateSha]);
    return result.exitCode === 0 ? result.stdout.trim() : '';
  }

  async isAncestor(stableSha: string, candidateSha: string): Promise<boolean> {
    const result = await this.run(['merge-base', '--is-ancestor', stableSha, candidateSha]);
    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new InternalError(`Cannot validate Git ancestry: ${result.stderr.trim()}`);
    }
    return result.exitCode === 0;
  }
}

export const allowedGitSubcommands = Object.freeze([...READ_ONLY_GIT_COMMANDS]);
