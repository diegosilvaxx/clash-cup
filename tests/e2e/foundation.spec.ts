import { navigateFromMenu } from './navigation';
import { expect, test } from '@playwright/test';

test('loads the federated and standalone portal and proxies API health', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
  await navigateFromMenu(page, 'Sobre');
  await expect(page.getByRole('heading', { name: 'Sobre a Clash Cup' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sobre a Clash Cup' })).toBeVisible();
  expect((await request.get('/api/health')).ok()).toBe(true);
  await page.goto('http://127.0.0.1:5301');
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('isolates remote failure and preserves recovery across navigation', async ({ page }) => {
  await page.route('http://127.0.0.1:5301/**', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar o portal.' }),
  ).toBeVisible();
  await navigateFromMenu(page, 'Sobre');
  await expect(page.getByRole('heading', { name: 'Sobre a Clash Cup' })).toBeVisible();
  await navigateFromMenu(page, 'Início');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await page.unroute('http://127.0.0.1:5301/**');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
  await navigateFromMenu(page, 'Sobre');
  await navigateFromMenu(page, 'Início');
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
});
