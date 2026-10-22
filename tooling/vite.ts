import { resolve } from 'node:path';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { runtimeConfigSchema } from '../packages/contracts/src/index.ts';
import { aliases, repositoryRoot } from './aliases.ts';

const ports = {
  shell: 5300,
  portal: 5301,
  auth: 5302,
  competition: 5303,
  player: 5304,
  admin: 5305,
} as const;

function runtimeConfigPlugin(mode: string): Plugin {
  const env = loadEnv(mode, repositoryRoot, 'CUP_');
  const container = env.CUP_CONTAINER_BUILD === 'true' || mode === 'vercel';
  const content = JSON.stringify(
    runtimeConfigSchema.parse({
      remotes: {
        portal: container
          ? '/remotes/portal/remoteEntry.js'
          : env.CUP_PORTAL_REMOTE_URL || 'http://127.0.0.1:5301/remoteEntry.js',
        auth: container
          ? '/remotes/auth/remoteEntry.js'
          : env.CUP_AUTH_REMOTE_URL || 'http://127.0.0.1:5302/remoteEntry.js',
        competition: container
          ? '/remotes/competition/remoteEntry.js'
          : env.CUP_COMPETITION_REMOTE_URL || 'http://127.0.0.1:5303/remoteEntry.js',
        player: container
          ? '/remotes/player/remoteEntry.js'
          : env.CUP_PLAYER_REMOTE_URL || 'http://127.0.0.1:5304/remoteEntry.js',
        admin: container
          ? '/remotes/admin/remoteEntry.js'
          : env.CUP_ADMIN_REMOTE_URL || 'http://127.0.0.1:5305/remoteEntry.js',
      },
    }),
  );
  return {
    name: 'cup-runtime-config',
    configureServer(server) {
      server.middlewares.use('/runtime-config.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(content);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'runtime-config.json', source: content });
    },
  };
}

export function createAppConfig(application: keyof typeof ports) {
  return defineConfig(({ mode }) => {
    const apiUrl = loadEnv(mode, repositoryRoot, 'CUP_').CUP_API_URL || 'http://127.0.0.1:5400';
    const container =
      loadEnv(mode, repositoryRoot, 'CUP_').CUP_CONTAINER_BUILD === 'true' || mode === 'vercel';
    return {
      base: container && application !== 'shell' ? `/remotes/${application}/` : '/',
      define:
        mode === 'vercel' ? { 'import.meta.env.VITE_SHELL_URL': 'window.location.origin' } : {},
      root: resolve(repositoryRoot, 'apps', application),
      envDir: repositoryRoot,
      plugins: [
        react(),
        federation({
          name: application,
          filename: 'remoteEntry.js',
          manifest: true,
          dts: false,
          shareStrategy: 'loaded-first',
          exposes: application === 'shell' ? {} : { './App': './src/App.tsx' },
          shared: {
            react: { singleton: true, requiredVersion: '19.3.0' },
            'react/': { singleton: true, requiredVersion: '19.3.0' },
            'react-dom': { singleton: true, requiredVersion: '19.3.0' },
            'react-dom/': { singleton: true, requiredVersion: '19.3.0' },
            'react-router-dom': { singleton: true, requiredVersion: '7.18.4' },
            'react-router': { singleton: true, requiredVersion: '7.18.4' },
            'styled-components': { singleton: true, requiredVersion: '6.5.3' },
            '@clash-cup/firebase': {
              singleton: true,
              version: '0.1.0',
              requiredVersion: '0.1.0',
              import: resolve(repositoryRoot, 'packages/firebase/src/index.ts').replaceAll(
                '\\',
                '/',
              ),
            },
            '@clash-cup/session': {
              singleton: true,
              version: '0.1.0',
              requiredVersion: '0.1.0',
              import: resolve(repositoryRoot, 'packages/session/src/index.ts').replaceAll(
                '\\',
                '/',
              ),
            },
          },
        }),
        ...(application === 'shell' ? [runtimeConfigPlugin(mode)] : []),
      ],
      resolve: {
        alias: aliases,
        dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'styled-components'],
      },
      server: {
        host: '127.0.0.1',
        port: ports[application],
        strictPort: true,
        origin: mode === 'vercel' ? '' : `http://127.0.0.1:${ports[application]}`,
        cors: true,
        fs: { allow: [repositoryRoot] },
        proxy: { '/api': { target: apiUrl, changeOrigin: true } },
      },
      preview: {
        host: '127.0.0.1',
        port: ports[application],
        strictPort: true,
        cors: true,
        proxy: { '/api': { target: apiUrl, changeOrigin: true } },
      },
      build: {
        target: 'es2022',
        outDir:
          mode === 'vercel'
            ? application === 'shell'
              ? resolve(repositoryRoot, 'dist/vercel/shell')
              : resolve(repositoryRoot, 'dist/vercel', application, 'remotes', application)
            : resolve(repositoryRoot, mode === 'e2e' ? 'dist/e2e' : 'dist', application),
        emptyOutDir: true,
      },
    };
  });
}
