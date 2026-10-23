import { test, expect } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
import { navigateFromMenu } from './navigation';

test('reuses public reads across home, tournaments and ranking, loading history on demand', async ({
  page,
  context,
}) => {
  const firebase = await mockFirebase(context, { rewards: { ranking: 'available' } });
  await page.goto('/');
  await expect(page.getByText('Líder da comunidade')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Copa da comunidade', exact: true })).toBeVisible();
  expect(firebase.competition.getQueryCounts()).toEqual({ tournament: 1, ranking: 1 });
  await navigateFromMenu(page, 'Ranking');
  await expect(page.getByRole('table')).toBeVisible();
  expect(firebase.competition.getQueryCounts()).toEqual({ tournament: 1, ranking: 1, shop: 1 });
  await page.getByRole('combobox', { name: /Classificação/ }).selectOption('year');
  await expect(page.getByRole('table')).toBeVisible();
  expect(firebase.competition.getQueryCounts().rankingHistory).toBe(1);
  const expected = firebase.competition.getQueryCounts();
  for (let count = 0; count < 3; count++) {
    await navigateFromMenu(page, 'Início');
    await expect(page.getByText('Líder da comunidade')).toBeVisible();
    await navigateFromMenu(page, 'Torneios');
    await expect(page.getByRole('link', { name: 'Ver torneio' })).toBeVisible();
    await navigateFromMenu(page, 'Ranking');
    await expect(page.getByRole('table')).toBeVisible();
  }
  expect(firebase.competition.getQueryCounts()).toEqual(expected);
  await page.getByRole('button', { name: 'Atualizar ranking' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(firebase.competition.getQueryCounts()).toEqual({
    tournament: 1,
    ranking: 2,
    shop: 2,
    rankingHistory: 1,
  });
  expect(firebase.getBlocked()).toEqual([]);
});
