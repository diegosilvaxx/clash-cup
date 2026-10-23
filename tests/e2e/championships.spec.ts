import { expect, test } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
import { createEightJourney, importRoster, signInChampionship } from './championship-journey';

test('creates a draft, publishes, persists results, exports a poster and shares a read-only bracket', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await createEightJourney(page);
  expect(firebase.getBlocked()).toEqual([]);
});

test('creates 16 and 32 player brackets without horizontal page overflow', async ({
  page,
  context,
}) => {
  await mockFirebase(context, { profile: 'current' });
  await signInChampionship(page);
  for (const size of [16, 32]) {
    await page.goto('/campeonatos/novo');
    await page.getByLabel('Nome do campeonato').fill(`Copa ${size}`);
    await page.getByLabel('Competidores', { exact: true }).selectOption(String(size));
    await importRoster(page, size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Publicar e gerar chaveamento' }).click();
    await expect(page.getByRole('heading', { name: `Copa ${size}`, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Final', exact: true }).click();
    await expect(
      page.getByRole('article', { name: `Confronto ${Math.log2(size) - 1}-0`, exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('retains the editor fields after a failed write', async ({ page, context }) => {
  const firebase = await mockFirebase(context, { profile: 'current' });
  await signInChampionship(page);
  await page.goto('/campeonatos/novo');
  await page.getByLabel('Nome do campeonato').fill('Rascunho seguro');
  firebase.competition.failCommit(true);
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('alert')).toContainText('permissões');
  await expect(page.getByLabel('Nome do campeonato')).toHaveValue('Rascunho seguro');
  firebase.competition.failCommit(false);
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('heading', { name: 'Rascunho seguro', exact: true })).toBeVisible();
});
