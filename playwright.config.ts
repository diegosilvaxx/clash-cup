import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5300',
    browserName: 'chromium',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:5300',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
