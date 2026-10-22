import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createClashService } from './clash-client';
import { createApiServer } from './server';

export async function startApi(repositoryRoot: string) {
  const envFile = resolve(repositoryRoot, '.env');
  if (existsSync(envFile)) loadEnvFile(envFile);
  const port = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .parse(process.env.CUP_API_PORT || 5400);
  const server = createApiServer(createClashService(process.env.CLASH_ROYALE_API_TOKEN));
  const host = z.enum(['127.0.0.1', '0.0.0.0']).parse(process.env.CUP_API_HOST || '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const folder = fileURLToPath(new URL('.', import.meta.url));
  const server = await startApi(resolve(folder, basename(folder) === 'src' ? '../../..' : '../..'));
  console.log(`Clash Cup API: http://127.0.0.1:${(server.address() as { port: number }).port}`);
  const close = () => {
    server.close();
    server.closeIdleConnections();
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
