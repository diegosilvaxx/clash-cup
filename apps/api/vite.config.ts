import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { aliases, repositoryRoot } from '../../tooling/aliases.ts';

export default defineConfig({
  resolve: { alias: aliases },
  ssr: { noExternal: ['@clash-cup/contracts'] },
  build: {
    ssr: './src/main.ts',
    target: 'node24',
    outDir: resolve(repositoryRoot, 'dist/api'),
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'server.js' } },
  },
});
