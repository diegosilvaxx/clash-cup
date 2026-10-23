import { expect, type Page } from '@playwright/test';
import { navigateFromMenu } from './navigation';
export async function signInChampionship(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
}
export async function importRoster(page: Page, size: number) {
  await page.getByText('Importar lista de jogadores', { exact: true }).click();
  await page
    .getByLabel('Um nome por linha')
    .fill(Array.from({ length: size }, (_, index) => `Jogador ${index + 1}`).join('\n'));
  await page.getByRole('button', { name: 'Aplicar lista' }).click();
}
export async function createEightJourney(page: Page, verifyDownload = true) {
  await signInChampionship(page);
  await navigateFromMenu(page, 'Meus campeonatos');
  await page.getByRole('link', { name: 'Criar campeonato', exact: false }).click();
  await page.getByLabel('Nome do campeonato').fill('Copa dos Reis');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Rascunho privado', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar link' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('link', { name: 'Editar rascunho e publicar' }).click();
  await importRoster(page, 8);
  await page.getByLabel('Disputa de terceiro lugar').check();
  await page.getByRole('button', { name: 'Publicar e gerar chaveamento' }).click();
  await expect(page.getByRole('heading', { name: 'Copa dos Reis', exact: true })).toBeVisible();
  const address = page.url();
  await page
    .getByRole('article', { name: 'Confronto 0-0', exact: true })
    .getByLabel('Placar de Jogador 1', { exact: true })
    .fill('2');
  await page
    .getByRole('article', { name: 'Confronto 0-0', exact: true })
    .getByRole('button', { name: 'Salvar placar' })
    .click();
  await expect(page.getByRole('status')).toContainText('Placar salvo.');
  await page.getByRole('button', { name: 'Semifinal', exact: true }).click();
  await expect(
    page
      .getByRole('article', { name: 'Confronto 1-0', exact: true })
      .getByText('Jogador 1', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Semifinal', exact: true }).click();
  await expect(
    page
      .getByRole('article', { name: 'Confronto 1-0', exact: true })
      .getByText('Jogador 1', { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arte JPG' }).click();
  const poster = await download;
  expect(poster.suggestedFilename()).toBe('clash-cup-campeonato.jpg');
  if (verifyDownload) expect(await poster.failure()).toBeNull();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.goto(address);
  await expect(page.getByRole('heading', { name: 'Copa dos Reis', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar placar' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
