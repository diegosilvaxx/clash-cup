import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { aliases } from './tooling/aliases.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      ...aliases,
      '@clash-cup/firebase': fileURLToPath(
        new URL('./packages/firebase/src/index.ts', import.meta.url),
      ),
      '@clash-cup/session': fileURLToPath(
        new URL('./packages/session/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    pool: 'threads',
    environment: 'node',
    include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
});
