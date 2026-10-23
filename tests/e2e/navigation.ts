import type { Page } from '@playwright/test';

export async function navigateFromMenu(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Abrir menu', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name, exact: true })
    .click();
}
