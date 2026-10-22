import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer, preview } from 'vite';
import { tsImport } from 'tsx/esm/api';

const root = fileURLToPath(new URL('..', import.meta.url));
const production = process.argv.includes('--preview');
const mode = process.argv.includes('--e2e') ? 'e2e' : production ? 'production' : 'development';
const servers = [];
let api;
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  if (api) {
    const closed = new Promise((resolve) => api.close(resolve));
    api.closeAllConnections();
    await closed;
  }
  await Promise.allSettled(
    servers.map((server) =>
      production
        ? new Promise((resolve) => {
            server.httpServer.close(resolve);
            server.httpServer.closeAllConnections();
          })
        : server.close(),
    ),
  );
  process.exit(code);
}
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
try {
  const backend = production
    ? await import(pathToFileURL(resolve(root, 'dist/api/server.js')).href)
    : await tsImport('../apps/api/src/main.ts', {
        parentURL: import.meta.url,
        tsconfig: resolve(root, 'tsconfig.json'),
      });
  api = await backend.startApi(root);
  console.log(`API: http://127.0.0.1:${api.address().port}`);
  for (const app of ['shell', 'portal', 'auth', 'competition']) {
    const options = {
      mode,
      configFile: resolve(root, 'apps', app, 'vite.config.ts'),
      root: resolve(root, 'apps', app),
    };
    const server = production ? await preview(options) : await createServer(options);
    servers.push(server);
    if (!production) await server.listen();
    console.log(`${app}: ${server.resolvedUrls.local[0]}`);
  }
} catch (error) {
  console.error('Falha ao iniciar o workspace:', error.message);
  await close(1);
}
