import { expect, test, type Page } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
async function signIn(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
}
test('browses public tournaments and details without requiring login', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context);
  await page.goto('/torneios');
  await page.getByRole('link', { name: 'Ver detalhes' }).click();
  await expect(page.getByRole('heading', { name: 'Copa da comunidade' })).toBeVisible();
  await expect(page.getByText('1 de 2 vagas ocupadas · 1 disponíveis')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entre na sua conta' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(firebase.getBlocked()).toEqual([]);
});
test('joins the last seat, persists on reload, and releases the seat on cancellation', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  await page.goto('/torneios/cup');
  await page.getByRole('button', { name: 'Inscrever-se', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancelar inscrição' })).toBeVisible();
  expect(firebase.competition.getOccupied()).toBe(2);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cancelar inscrição' })).toBeVisible();
  await page.getByRole('link', { name: 'Minhas inscrições' }).click();
  await expect(page.getByText('Inscrição confirmada', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Copa da comunidade' }).click();
  await page.getByRole('button', { name: 'Cancelar inscrição' }).click();
  await expect(page.getByRole('button', { name: 'Inscrever-se', exact: true })).toBeVisible();
  expect(firebase.competition.getOccupied()).toBe(1);
  expect(firebase.competition.getCommits()).toBe(2);
  expect(firebase.getBlocked()).toEqual([]);
});
test('retains the vacancy and registration state after a failed commit', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  await page.goto('/torneios/cup');
  firebase.competition.failCommit(true);
  await page.getByRole('button', { name: 'Inscrever-se', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('permissões');
  expect(firebase.competition.getOccupied()).toBe(1);
  firebase.competition.failCommit(false);
  await page.getByRole('button', { name: 'Inscrever-se', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancelar inscrição' })).toBeVisible();
});
test('retries a conflicting transaction and reports that the last seat was taken', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signIn(page);
  await page.goto('/torneios/cup');
  firebase.competition.fillDuringCommit();
  await page.getByRole('button', { name: 'Inscrever-se', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('esgotaram');
  expect(firebase.competition.getCommits()).toBe(0);
  await page.getByRole('button', { name: 'Atualizar torneios' }).click();
  await expect(page.getByRole('button', { name: 'Vagas esgotadas' })).toBeDisabled();
});
test('preserves ambiguous legacy registrations without assigning them to a tournament', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, {
    profile: 'legacy',
    competitions: { legacy: true, ambiguous: true },
  });
  await signIn(page);
  await page.goto('/meus-torneios');
  await expect(
    page.getByText('Há mais de um torneio com este identificador antigo.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Inscrição sem torneio identificado' }),
  ).toBeVisible();
  expect(firebase.competition.getCommits()).toBe(0);
});
test('recovers a data read failure and displays an empty catalog', async ({ page, context }) => {
  const firebase = await mockFirebase(context, { competitions: { empty: true } });
  firebase.competition.deny(true);
  await page.goto('/torneios');
  await expect(page.getByRole('heading', { name: 'Torneios indisponíveis' })).toBeVisible();
  firebase.competition.deny(false);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhum torneio disponível no momento.')).toBeVisible();
});
test('loads competition standalone and isolates a failed remote from the portal', async ({
  page,
  context,
}) => {
  await mockFirebase(context);
  await page.goto('http://127.0.0.1:5303/torneios');
  await expect(page.getByRole('heading', { name: 'Copa da comunidade' })).toBeVisible();
  await page.route('http://127.0.0.1:5303/**', (route) => route.abort());
  await page.goto('/torneios');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os torneios.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Sobre', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sobre a Clash Cup' })).toBeVisible();
  await page.unroute('http://127.0.0.1:5303/**');
  await page.getByRole('link', { name: 'Torneios', exact: true }).click();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Copa da comunidade' })).toBeVisible();
  await page.getByRole('link', { name: 'Sobre', exact: true }).click();
  await page.getByRole('link', { name: 'Torneios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Copa da comunidade' })).toBeVisible();
});
