import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const root = fileURLToPath(new URL('..', import.meta.url));
const testEnv = parseEnv(await readFile(new URL('../docker/test.env', import.meta.url), 'utf8'));
const compose = ['compose', '--env-file', 'docker/test.env', '-p', 'clash-cup-test'];
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...testEnv, CUP_TEST_ORIGIN: 'http://127.0.0.1:5300' },
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command}: saída ${code}`)),
    );
  });
}
try {
  await run('docker', [...compose, 'config', '--quiet']);
  await run('docker', [...compose, 'down']);
  await run('docker', [
    ...compose,
    'up',
    '--build',
    '--wait',
    '--wait-timeout',
    '180',
    'api',
    'shell',
  ]);
  const health = await fetch('http://127.0.0.1:5300/api/health', {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(health.status, 200, 'API and shell start independently of the remotes');
  const missing = await fetch('http://127.0.0.1:5300/remotes/portal/remoteEntry.js', {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(missing.status, 502, 'the gateway keeps remote failures isolated');
  await run('docker', [...compose, 'up', '--build', '--wait', '--wait-timeout', '180']);
  await run(process.execPath, ['scripts/docker-smoke.mjs']);
  await run(process.execPath, [
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config',
    'playwright.docker.config.ts',
  ]);
  console.log('Verificação Docker concluída.');
} catch (error) {
  console.error(error.message);
  await run('docker', [...compose, 'logs', '--tail=50']).catch(() => {});
  process.exitCode = 1;
} finally {
  await run('docker', [...compose, 'down']).catch(() => {
    process.exitCode = 1;
  });
}
