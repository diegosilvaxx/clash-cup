import { expect, test } from '@playwright/test';
import { mockFirebase } from '../e2e/firebase-fixture';

test('loads public modules and assets through the single gateway', async ({ page }) => {
  const moduleRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('remoteEntry.js')) moduleRequests.push(request.url());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Seu próximo desafio começa aqui.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Apoiadores', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  for (const image of await page.getByRole('article').locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
  await page.reload();
  await expect(page).toHaveTitle('Apoiadores | Clash Cup Brasil');
  expect(
    moduleRequests.some((url) => new URL(url).pathname === '/remotes/portal/remoteEntry.js'),
  ).toBe(true);
  expect(moduleRequests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shares the session across auth, player and admin services with isolated fixtures', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current', access: 'responsible' });
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver perfil do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Administração' })).toBeVisible();
  expect(firebase.getWrites()).toBe(0);
  expect(firebase.getBlocked()).toEqual([]);
});
