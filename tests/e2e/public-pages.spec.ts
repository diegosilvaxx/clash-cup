import { expect, test } from '@playwright/test';

test('navigates public pages, supports keyboard questions and reloads deep links', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Seu próximo desafio começa aqui.',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const footer = page.getByRole('navigation', { name: 'Informações da comunidade' });
  await footer.getByRole('link', { name: 'Regras e dúvidas' }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveTitle('Regras e dúvidas | Clash Cup Brasil');
  const question = page.locator('summary').filter({ hasText: 'Como começo a participar?' });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Crie uma conta por email e senha/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Crie uma conta por email e senha/)).toBeHidden();
  for (const [label, path] of [
    ['Contato', '/contato'],
    ['Apoiadores', '/apoiadores'],
    ['Dados e privacidade', '/politicas'],
  ]) {
    await footer.getByRole('link', { name: label!, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: label! })).toBeVisible();
    await expect(footer.getByRole('link', { name: label!, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: label! })).toBeVisible();
    await expect(page).toHaveTitle(`${label} | Clash Cup Brasil`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('keeps public pages usable at narrow widths and increased text size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ['/', '/regras', '/contato', '/apoiadores', '/politicas']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 24px; }' });
    if (path === '/apoiadores') {
      await expect(page.getByRole('article')).toHaveCount(3);
      for (const image of await page.getByRole('article').locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
          )
          .toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('opens public content independently and returns other applications to the host', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:5301/contato');
  await expect(page.getByRole('heading', { name: 'Contato' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'contato@clashcup.com.br' })).toHaveAttribute(
    'href',
    'mailto:contato@clashcup.com.br',
  );
  await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page.getByRole('link', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Explorar torneios' })).toHaveAttribute(
    'href',
    'http://127.0.0.1:5300/torneios',
  );
  await page.goto('http://127.0.0.1:5304/area-vip');
  await page.getByRole('link', { name: 'Contato', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5300/contato');
  await expect(page.getByRole('heading', { name: 'Contato' })).toBeVisible();
});
