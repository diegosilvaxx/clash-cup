import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const applications = ['shell', 'portal', 'auth', 'competition', 'player', 'admin', 'api'];
const requested = process.argv[2];
if (requested && !applications.includes(requested)) throw new Error('Aplicação de build inválida.');
for (const app of requested ? [requested] : applications) {
  await build({
    root: resolve(root, 'apps', app),
    configFile: resolve(root, 'apps', app, 'vite.config.ts'),
    mode: 'vercel',
    ...(app === 'api'
      ? {
          build: {
            ssr: './src/vercel.ts',
            outDir: resolve(root, 'dist/vercel/api'),
            rollupOptions: { output: { entryFileNames: 'vercel.js' } },
          },
        }
      : {}),
  });
}
