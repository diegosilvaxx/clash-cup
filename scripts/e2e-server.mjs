import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-clash-cup.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-clash-cup',
  VITE_FIREBASE_APP_ID: 'test-app-id',
  CUP_API_PORT: '5400',
  CUP_API_URL: 'http://127.0.0.1:5400',
  CUP_PORTAL_REMOTE_URL: 'http://127.0.0.1:5301/remoteEntry.js',
  CUP_AUTH_REMOTE_URL: 'http://127.0.0.1:5302/remoteEntry.js',
});
for (const app of ['api', 'shell', 'portal', 'auth']) {
  await build({
    root: resolve(root, 'apps', app),
    configFile: resolve(root, 'apps', app, 'vite.config.ts'),
    mode: 'e2e',
    logLevel: 'warn',
  });
}
process.argv.push('--preview', '--e2e');
await import('./dev.mjs');
