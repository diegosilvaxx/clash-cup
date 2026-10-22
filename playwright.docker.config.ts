import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/deployment',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/docker', open: 'never' }]],
  outputDir: 'test-results/docker',
  use: {
    baseURL: process.env.CUP_TEST_ORIGIN || 'http://127.0.0.1:5300',
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
});
