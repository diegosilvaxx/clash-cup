import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { aliases } from './tooling/aliases.ts';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: aliases },
  test: {
    pool: 'threads',
    environment: 'node',
    include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
});
