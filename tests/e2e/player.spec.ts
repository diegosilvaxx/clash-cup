import { navigateFromMenu } from './navigation';
import { expect, test, type Page } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
async function signIn(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
}
test('displays the linked player statistics and deck, refreshes and restores after reload', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  await page.getByRole('link', { name: 'Ver perfil do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil do jogador' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  await expect(page.getByText('9.000', { exact: true })).toBeVisible();
  await expect(page.getByText('Clã da comunidade', { exact: false })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Deck atual' })).toContainText('Arqueiras');
  await expect(page.getByRole('list', { name: 'Deck atual' }).locator('img')).toHaveCount(0);
  expect(firebase.getPlayerReads()).toBe(1);
  await page.getByRole('button', { name: 'Atualizar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  expect(firebase.getPlayerReads()).toBe(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(firebase.getWrites()).toBe(0);
  expect(firebase.getBlocked()).toEqual([]);
});
test('loads chests independently and recovers an API failure', async ({ page, context }) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  firebase.failChestLookup(true);
  await page.goto('/baus');
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  expect(firebase.getPlayerReads()).toBe(0);
  firebase.failChestLookup(false);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  const list = page.getByRole('list', { name: 'Sequência de baús' });
  await expect(list.getByRole('listitem').first()).toContainText('Silver Chest');
  await expect(list.getByRole('listitem').first()).toContainText('Próximo baú');
  await expect(list.getByRole('listitem').nth(1)).toContainText('Após 2 baús');
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.goto('/baus');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  expect(firebase.getChestReads()).toBe(2);
});
test('handles a minimal player response and an empty chest sequence', async ({ page, context }) => {
  await mockFirebase(context, { profile: 'current', player: 'minimal', chests: 'empty' });
  await signIn(page);
  await page.goto('/perfil');
  await expect(page.getByText('O deck atual não foi informado.')).toBeVisible();
  await page.getByRole('link', { name: 'Baús', exact: true }).click();
  await expect(page.getByText('Nenhum baú disponível para este jogador no momento.')).toBeVisible();
});
test('requires login and a linked player before querying personal game data', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context);
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Vincule seu jogador' })).toBeVisible();
  await page.goto('/baus');
  await expect(page.getByRole('heading', { name: 'Vincule seu jogador' })).toBeVisible();
  expect(firebase.getPlayerReads()).toBe(0);
  expect(firebase.getChestReads()).toBe(0);
});
test('keeps VIP informational and loads its standalone entry without querying the game', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context);
  await page.goto('/area-vip');
  await expect(page.getByRole('heading', { name: 'Área VIP' })).toBeVisible();
  const support = page.getByRole('link', { name: 'Conhecer as opções de apoio (nova aba)' });
  await expect(support).toHaveAttribute('href', 'https://www.patreon.com/clashcupbrasil');
  await expect(support).toHaveAttribute('rel', 'noopener noreferrer');
  await page.goto('http://127.0.0.1:5304');
  await expect(page.getByRole('heading', { name: 'Área VIP' })).toBeVisible();
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acesse sua conta pelo portal' })).toBeVisible();
  expect(firebase.getPlayerReads()).toBe(0);
  expect(firebase.getChestReads()).toBe(0);
});
test('isolates an unavailable player remote and preserves recovery during navigation', async ({
  page,
  context,
}) => {
  await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  await page.route('http://127.0.0.1:5304/**', (route) => route.abort());
  await page.goto('/perfil');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar a área do jogador.' }),
  ).toBeVisible();
  await navigateFromMenu(page, 'Sobre');
  await expect(page.getByRole('heading', { name: 'Sobre a Clash Cup' })).toBeVisible();
  await page.unroute('http://127.0.0.1:5304/**');
  await navigateFromMenu(page, 'Meu perfil');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
  await navigateFromMenu(page, 'Sobre');
  await navigateFromMenu(page, 'Meu perfil');
  await expect(page.getByRole('heading', { name: 'Jogador de teste' })).toBeVisible();
});
