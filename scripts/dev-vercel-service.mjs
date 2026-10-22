import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { port: { type: 'string' } },
});
const app = positionals[0];
if (!['shell', 'portal', 'auth', 'competition', 'player', 'admin'].includes(app))
  throw new Error('Informe uma aplicação frontend válida.');
const port = Number(values.port || process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Execute por vercel dev para receber PORT, ou informe --port.');
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  root: resolve(root, 'apps', app),
  configFile: resolve(root, 'apps', app, 'vite.config.ts'),
  mode: 'vercel',
  server: { host: '127.0.0.1', port, strictPort: true, origin: '' },
});
const close = () => void server.close();
process.once('SIGINT', close);
process.once('SIGTERM', close);
await server.listen();
server.printUrls();
