import { navigateFromMenu } from './navigation';
import { expect, test, type Page } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';

async function signIn(page: Page, password = 'valid-password') {
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar com email' }).click();
}
test('signs in, shares the session with the shell, restores it on reload and signs out', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await page.goto('/minha-conta');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  await navigateFromMenu(page, 'Início');
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Minha conta' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
  await page.goto('/minha-conta');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  expect(firebase.getWrites()).toBe(0);
  expect(firebase.getBlocked()).toEqual([]);
});
test('registers and links a player, preserving the tag after an API failure', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context);
  await page.goto('/cadastro');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByLabel('Confirmar senha').fill('valid-password');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vincule seu jogador' })).toBeVisible();
  await page.getByLabel('Tag do jogador').fill('#p0y');
  firebase.failPlayerLookup(true);
  await page.getByRole('button', { name: 'Vincular jogador' }).click();
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  await expect(page.getByLabel('Tag do jogador')).toHaveValue('#p0y');
  firebase.failPlayerLookup(false);
  await page.getByRole('button', { name: 'Vincular jogador' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await expect(page.getByText('#P0Y', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  expect(firebase.getWrites()).toBe(1);
  expect(firebase.getBlocked()).toEqual([]);
});
test('displays an invalid credential error without losing the entered email', async ({
  page,
  context,
}) => {
  await mockFirebase(context);
  await page.goto('/entrar');
  await signIn(page, 'incorrect-password');
  await expect(page.getByRole('alert')).toContainText('Email ou senha inválidos.');
  await expect(page.getByLabel('Email')).toHaveValue('player@example.test');
});
test('recovers a legacy profile without rewriting it', async ({ page, context }) => {
  const firebase = await mockFirebase(context, { profile: 'legacy' });
  await page.goto('/entrar');
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await expect(page.getByText('#P0Y', { exact: true })).toBeVisible();
  expect(firebase.getWrites()).toBe(0);
});
test('does not show onboarding when profile access is denied', async ({ page, context }) => {
  const firebase = await mockFirebase(context, { profileDenied: true });
  await page.goto('/entrar');
  await signIn(page);
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar seu jogador.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vincule seu jogador' })).not.toBeVisible();
  expect(firebase.getWrites()).toBe(0);
});
test('loads the standalone authentication application', async ({ page, context }) => {
  await mockFirebase(context, { profile: 'current' });
  await page.goto('http://127.0.0.1:5302/entrar');
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keeps the portal usable when the authentication remote is unavailable', async ({
  page,
  context,
}) => {
  await mockFirebase(context);
  await page.route('http://127.0.0.1:5302/**', (route) => route.abort());
  await page.goto('/entrar');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar o acesso à conta.' }),
  ).toBeVisible();
  await navigateFromMenu(page, 'Início');
  await expect(
    page.getByRole('heading', { name: 'Entre na arena. Conquiste seu lugar.' }),
  ).toBeVisible();
  await page.unroute('http://127.0.0.1:5302/**');
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
});
