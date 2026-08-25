import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const testDirectory = path.resolve('dist/test');
const testFiles = (await readdir(testDirectory))
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join(testDirectory, file));

const child = spawn(process.execPath, ['--test', ...testFiles], {
  shell: false,
  stdio: 'inherit',
  windowsHide: true,
});

child.once('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
child.once('close', (code) => {
  process.exitCode = code ?? 1;
});
