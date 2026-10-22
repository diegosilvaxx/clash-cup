// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@clash-cup/session';
import { App } from './App';
const mocks = vi.hoisted(() => ({
  state: {} as SessionSnapshot,
  overview: vi.fn(),
  saveTournament: vi.fn(),
  refreshPermissions: vi.fn(),
  roles: vi.fn(),
}));
vi.mock('@clash-cup/session', () => ({
  useSession: () => mocks.state,
  session: { getSnapshot: () => mocks.state },
}));
vi.mock('./client', async (original) => ({
  ...(await original<typeof import('./client')>()),
  adminClient: mocks,
}));
const overview = {
  tournaments: [
    {
      id: 'cup',
      name: 'Cup',
      description: '',
      date: '',
      tournamentLink: '',
      vacancies: 2,
      occupied: 1,
      status: 'open',
    },
  ],
  wallets: [],
  imports: [],
  invalidTournaments: 0,
  invalidWallets: 0,
  invalidImports: 0,
};
beforeEach(() => {
  mocks.state = {
    status: 'authenticated',
    user: {
      uid: 'a',
      email: 'a@example.test',
      emailVerified: true,
      displayName: null,
      admin: true,
    },
    profile: null,
    profileStatus: 'ready',
    profileError: null,
    pending: false,
    error: null,
  };
  mocks.overview.mockReset().mockResolvedValue(overview);
  mocks.saveTournament.mockReset().mockResolvedValue({ saved: true });
  mocks.refreshPermissions.mockReset().mockResolvedValue(undefined);
  mocks.roles.mockReset();
});
afterEach(cleanup);
function mount(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/entrar" element={<h1>Login</h1>} />
        <Route path="*" element={<App />} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('administration access and forms', () => {
  it('waits for auth and redirects visitors without querying privileged data', () => {
    mocks.state.status = 'initializing';
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando sua conta');
    cleanup();
    mocks.state.status = 'anonymous';
    mocks.state.user = null;
    mount();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeVisible();
    expect(mocks.overview).not.toHaveBeenCalled();
  });
  it('shows restricted access and lets an ordinary account refresh claims', () => {
    mocks.state.user!.admin = false;
    mount();
    expect(screen.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar permissões' }));
    expect(mocks.refreshPermissions).toHaveBeenCalled();
    expect(mocks.overview).not.toHaveBeenCalled();
  });
  it('recovers a failed overview without treating it as an empty admin dataset', async () => {
    mocks.overview.mockRejectedValueOnce(new Error('private configuration'));
    mount();
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeVisible();
    expect(mocks.overview).toHaveBeenCalledTimes(2);
  });
  it('submits only editable fields and preserves the tournament identity', async () => {
    mount('/admin/torneios');
    fireEvent.change(await screen.findByLabelText('Selecionar torneio'), {
      target: { value: 'cup' },
    });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Torneio atualizado.')).toBeVisible();
    expect(mocks.saveTournament).toHaveBeenCalledWith(
      {
        id: 'cup',
        name: 'Renamed',
        description: '',
        date: '',
        tournamentLink: '',
        vacancies: 2,
        status: 'open',
      },
      false,
    );
  });
  it('does not query role management for an ordinary administrator', async () => {
    mount('/admin/acessos');
    expect(
      await screen.findByText(
        'Somente o administrador responsável pode conceder ou revogar acesso administrativo.',
      ),
    ).toBeVisible();
    expect(mocks.roles).not.toHaveBeenCalled();
  });
});
