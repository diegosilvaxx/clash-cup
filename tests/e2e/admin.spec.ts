import { expect, test, type Page } from '@playwright/test';
import { mockFirebase } from './firebase-fixture';
async function signIn(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email', { exact: true }).fill('player@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Entrar com email' }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
}
test('denies visitors and ordinary accounts without requesting administrative data', async ({
  page,
  context,
  request,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current' });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await signIn(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  expect(fixture.admin.getCalls()).toBe(0);
  expect((await request.get('/api/admin/overview')).status()).toBe(401);
});
test('creates and edits a tournament without resetting its registrations', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current', access: 'admin' });
  await signIn(page);
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Administração' })
    .getByRole('link', { name: 'Torneios', exact: true })
    .click();
  await page.getByLabel('Nome', { exact: true }).fill('Nova Copa');
  await page.getByRole('button', { name: 'Criar torneio', exact: true }).click();
  await expect(page.getByText('Torneio criado.', { exact: true })).toBeVisible();
  await page.getByLabel('Selecionar torneio').selectOption('cup');
  await page.getByLabel('Nome', { exact: true }).fill('Copa atualizada');
  await page.getByLabel('Inscrições', { exact: true }).selectOption('closed');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByText('Torneio atualizado.', { exact: true })).toBeVisible();
  expect(fixture.admin.data.tournaments.find((item) => item.id === 'cup')).toMatchObject({
    occupied: 1,
    status: 'closed',
  });
  expect(fixture.admin.getMutations()[1]?.body).not.toHaveProperty('occupied');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('associates a verified wallet without changing gold and limits role management', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current', access: 'admin' });
  await signIn(page);
  await page.goto('/admin/saldos');
  await page.getByLabel('Saldo', { exact: true }).selectOption('#P0Y');
  await page.getByLabel('UID da conta', { exact: true }).fill('fixture-user');
  await page
    .getByLabel('Verificação realizada', { exact: true })
    .fill('Confirmação de titularidade pela organização');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Associar saldo', exact: true }).click();
  await expect(
    page.getByText('Saldo associado. O valor e os emblemas foram preservados.'),
  ).toBeVisible();
  expect(fixture.admin.data.wallets[0]).toMatchObject({ gold: 10, ownerUid: 'fixture-user' });
  await page.goto('/admin/acessos');
  await expect(
    page.getByText(
      'Somente o administrador responsável pode conceder ou revogar acesso administrativo.',
    ),
  ).toBeVisible();
  expect(fixture.admin.getMutations().some((item) => item.path === '/roles')).toBe(false);
});
test('resumes an interrupted import and never credits it twice', async ({ page, context }) => {
  const fixture = await mockFirebase(context, { profile: 'current', access: 'admin' });
  await signIn(page);
  await page.goto('/admin/resultados');
  await page.getByLabel('Tag do torneio').fill('#CUP');
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  const start = page.getByRole('button', { name: 'Confirmar e importar', exact: true });
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox').check();
  fixture.admin.failProcess(true);
  await start.click();
  await expect(page.getByRole('alert')).toContainText('Falha temporária');
  expect(fixture.admin.getCredits()).toBe(0);
  fixture.admin.failProcess(false);
  await page.getByRole('button', { name: 'Retomar importação', exact: true }).click();
  await expect(page.getByText(/1 de 1 jogadores processados. Importação concluída/)).toBeVisible();
  expect(fixture.admin.getCredits()).toBe(1);
  const body = fixture.admin.getMutations().find((item) => item.path === '/imports')?.body;
  expect(body).toMatchObject({ confirmedNew: true });
  expect(body).not.toHaveProperty('members');
  await page.reload();
  await page.getByLabel('Tag do torneio').fill('#CUP');
  await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar importação registrada' })).toBeDisabled();
  expect(fixture.admin.getCredits()).toBe(1);
});
test('recovers a server error and manages access only as responsible administrator', async ({
  page,
  context,
}) => {
  const fixture = await mockFirebase(context, { profile: 'current', access: 'responsible' });
  await signIn(page);
  fixture.admin.fail(true);
  await page.goto('/admin');
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  fixture.admin.fail(false);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page
    .getByRole('navigation', { name: 'Administração' })
    .getByRole('link', { name: 'Acessos', exact: true })
    .click();
  await page.getByLabel('Email da conta').fill('another@example.test');
  await page.getByRole('button', { name: 'Aplicar alteração de acesso' }).click();
  await expect(
    page.getByText('Acesso concedido. A conta deve atualizar as permissões ou entrar novamente.'),
  ).toBeVisible();
  expect(fixture.admin.getMutations()).toContainEqual({
    path: '/roles',
    body: { email: 'another@example.test', action: 'grant' },
  });
});
