import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { preview } from 'vite';

// Local integration test for the deployment artifacts; this does not emulate Vercel's infrastructure.
const root = fileURLToPath(new URL('..', import.meta.url));
Object.assign(
  process.env,
  parseEnv(await readFile(new URL('../docker/test.env', import.meta.url), 'utf8')),
);
await import('./build-vercel.mjs');
const servers = [];
let api;
async function close(code = 0) {
  api?.closeAllConnections();
  if (api) await new Promise((resolve) => api.close(resolve));
  await Promise.allSettled(
    servers.map(
      (server) =>
        new Promise((resolve) => {
          server.httpServer.close(resolve);
          server.httpServer.closeAllConnections();
        }),
    ),
  );
  process.exit(code);
}
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
try {
  api = (await import(pathToFileURL(resolve(root, 'dist/vercel/api/vercel.js')).href)).default;
  await new Promise((resolve, reject) => {
    api.once('error', reject);
    api.listen(5400, '127.0.0.1', resolve);
  });
  const proxy = Object.fromEntries(
    ['portal', 'auth', 'competition', 'player', 'admin'].map((app, index) => [
      `/remotes/${app}/`,
      { target: `http://127.0.0.1:${5301 + index}` },
    ]),
  );
  for (const app of ['portal', 'auth', 'competition', 'player', 'admin', 'shell']) {
    const server = await preview({
      root: resolve(root, 'apps', app),
      configFile: resolve(root, 'apps', app, 'vite.config.ts'),
      mode: 'vercel',
      ...(app === 'shell' ? { preview: { proxy } } : {}),
    });
    servers.push(server);
  }
  console.log('Artefatos Vercel para testes: http://127.0.0.1:5300');
} catch (error) {
  console.error(error.message);
  await close(1);
}
