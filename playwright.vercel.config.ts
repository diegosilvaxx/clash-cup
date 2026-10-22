import { defineConfig } from '@playwright/test';
import deployment from './playwright.docker.config';

export default defineConfig({
  ...deployment,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/vercel', open: 'never' }]],
  outputDir: 'test-results/vercel',
  use: { ...deployment.use, baseURL: 'http://127.0.0.1:5300' },
  webServer: {
    command: 'node scripts/vercel-preview.mjs',
    url: 'http://127.0.0.1:5300',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
