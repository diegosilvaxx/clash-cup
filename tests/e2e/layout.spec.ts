import { expect, test } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
import { navigateFromMenu } from './navigation';

test('renders the new home with real repository data and working artwork', async ({
  page,
  context,
}, testInfo) => {
  await mockFirebase(context, { rewards: { ranking: 'available' } });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Entre na arena. Conquiste seu lugar.',
  );
  await expect(page.getByRole('link', { name: 'Copa da comunidade' })).toBeVisible();
  await expect(page.getByText('1 / 2 jogadores')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Ranking da temporada' }).getByText('Líder da comunidade'),
  ).toBeVisible();
  for (const image of await page.getByRole('main').locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
      )
      .toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  await navigateFromMenu(page, 'Torneios');
  await expect(page.getByRole('heading', { level: 1, name: 'Torneios' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver torneio' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Copa da comunidade' })).toBeVisible();
});

test('keeps the home within the viewport and the mobile menu accessible', async ({
  page,
  context,
}) => {
  await mockFirebase(context, { rewards: { ranking: 'available' } });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Copa da comunidade' })).toBeVisible();
  for (const width of [320, 360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 360, height: 800 });
  const toggle = page.locator('button[aria-controls="menu-principal"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByRole('dialog', { name: 'Menu de navegação' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('main').locator('..')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Fechar navegação', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator('a').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await navigateFromMenu(page, 'Torneios');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
