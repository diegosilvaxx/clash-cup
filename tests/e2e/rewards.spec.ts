import { expect, test, type Page } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';

async function signIn(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
}
test('buys once, equips a free item and preserves ownership across navigation and reload', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current', rewards: {} });
  await signIn(page);
  await page.goto('/loja');
  await expect(page.getByRole('heading', { name: 'Seu saldo: 10 Gold' })).toBeVisible();
  const emblemImage = page
    .getByRole('list', { name: 'Catálogo de emblemas' })
    .locator('img')
    .first();
  await expect
    .poll(() =>
      emblemImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Adquirir: Princesa zangada' }).click();
  await expect(page.getByRole('status')).toContainText('Emblema adquirido e equipado.');
  expect(fixture.competition.getGold()).toBe(0);
  expect(fixture.competition.getCommits()).toBe(1);
  await page.getByRole('button', { name: 'Adquirir: Goblin malabarista' }).click();
  await expect(page.getByRole('button', { name: 'Equipado: Goblin malabarista' })).toBeDisabled();
  expect(fixture.competition.getOwned()).toEqual(['angry', 'juggling']);
  await page
    .getByRole('navigation', { name: 'Área do jogador' })
    .getByRole('link', { name: 'Meus emblemas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Equipar: Princesa zangada' }).click();
  await expect(page.getByRole('status')).toContainText('Emblema equipado.');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Seu saldo: 0 Gold' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Equipado: Princesa zangada' })).toBeDisabled();
  expect(fixture.competition.getCommits()).toBe(3);
  expect(fixture.getPlayerReads()).toBe(0);
  expect(fixture.getBlocked()).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('does not allow spending an unclaimed legacy balance', async ({ page, context }) => {
  const fixture = await mockFirebase(context, {
    profile: 'current',
    rewards: { wallet: 'unclaimed' },
  });
  await signIn(page);
  await page.goto('/loja');
  await expect(page.getByRole('status')).toContainText('Seu saldo anterior está preservado');
  await expect(page.getByRole('button', { name: 'Adquirir: Princesa zangada' })).toBeDisabled();
  expect(fixture.competition.getCommits()).toBe(0);
});
test('recovers commit failures and rechecks balance on concurrent purchases', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current', rewards: {} });
  await signIn(page);
  await page.goto('/loja');
  const buy = page.getByRole('button', { name: 'Adquirir: Princesa zangada' });
  await expect(buy).toBeEnabled();
  fixture.competition.failCommit(true);
  await buy.click();
  await expect(page.getByRole('alert')).toContainText('permissão');
  expect(fixture.competition.getGold()).toBe(10);
  fixture.competition.failCommit(false);
  fixture.competition.spendDuringShopCommit();
  await buy.click();
  await expect(page.getByRole('alert')).toHaveText('Saldo insuficiente para comprar este emblema.');
  expect(fixture.competition.getOwned()).toEqual(['blow']);
  expect(fixture.competition.getCommits()).toBe(0);
  await page.getByRole('button', { name: 'Atualizar saldo' }).click();
  await expect(page.getByRole('heading', { name: 'Seu saldo: 5 Gold' })).toBeVisible();
});
test('lists public standings, annual totals, monthly history and recovers read failures', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { rewards: {} });
  fixture.competition.deny(true);
  await page.goto('/ranking');
  await expect(page.getByRole('alert')).toContainText('permissão');
  fixture.competition.deny(false);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Jogador de teste' })).toContainText('0');
  await page.getByRole('combobox', { name: /Classificação/ }).selectOption('year');
  await expect(page.getByRole('row').filter({ hasText: 'Jogador de teste' })).toContainText('5');
  await page.getByRole('combobox', { name: /Classificação/ }).selectOption('month');
  await page.getByLabel('Período').selectOption('2026-01');
  await expect(page.getByRole('row').filter({ hasText: 'Jogador de teste' })).toContainText('3');
  await page.goto('http://127.0.0.1:5303/ranking');
  await expect(page.getByRole('heading', { name: 'Ranking da comunidade' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  expect(fixture.competition.getCommits()).toBe(0);
});
