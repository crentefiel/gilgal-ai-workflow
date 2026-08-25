import assert from 'node:assert/strict';
import test from 'node:test';
import { runCommand } from '../src/runner/command-runner.js';
import { runCustomCommandCheck } from '../src/checks/custom-command.js';
import { nodeCommand } from './helpers.js';

const options = { cwd: process.cwd(), timeoutMs: 2_000, outputLimitBytes: 128 };

test('command exit 0 passes execution evidence', async () => {
  const result = await runCommand(nodeCommand('process.stdout.write("ok");process.exit(0)'), options);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'ok');
  assert.equal(result.timedOut, false);
});

test('command exit 1 is captured', async () => {
  const result = await runCommand(nodeCommand('process.stderr.write("bad");process.exit(1)'), options);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, 'bad');
});

test('timeout terminates the child and is never success', async () => {
  const result = await runCommand(nodeCommand('setTimeout(()=>{},5000)'), { ...options, timeoutMs: 50 });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
});

test('missing executable is an error and output is bounded', async () => {
  const missing = await runCommand('gilgal-command-that-does-not-exist', options);
  assert.ok(missing.spawnError);
  const bounded = await runCommand(nodeCommand('process.stdout.write("x".repeat(1000))'), options);
  assert.equal(Buffer.byteLength(bounded.stdout), 128);
  assert.equal(bounded.outputTruncated, true);
});

test('package-manager Node shims run without a command shell', async () => {
  const result = await runCommand('npm --version', options);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+/);
});

test('timeout and missing executables map to ERROR check status', async () => {
  const context = { projectRoot: process.cwd(), defaultTimeoutMs: 50, defaultOutputLimitBytes: 128 };
  const timeout = await runCustomCommandCheck('timeout', {
    enabled: true,
    command: nodeCommand('setTimeout(()=>{},5000)'),
  }, context);
  assert.equal(timeout.status, 'ERROR');
  const missing = await runCustomCommandCheck('missing', {
    enabled: true,
    command: 'gilgal-command-that-does-not-exist',
  }, context);
  assert.equal(missing.status, 'ERROR');
});
