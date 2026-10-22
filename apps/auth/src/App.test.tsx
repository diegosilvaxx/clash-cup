// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@clash-cup/session';
import { App } from './App';

const mocks = vi.hoisted(() => ({
  state: {} as SessionSnapshot,
  start: vi.fn(),
  retryProfile: vi.fn(),
}));
vi.mock('@clash-cup/session', () => ({
  useSession: () => mocks.state,
  session: mocks,
  getSessionError: () => 'Erro ao entrar.',
}));
beforeEach(() => {
  mocks.state = {
    status: 'anonymous',
    user: null,
    profile: null,
    profileStatus: 'idle',
    profileError: null,
    pending: false,
    error: null,
  };
});
afterEach(cleanup);
describe('auth routing', () => {
  it('redirects an anonymous private route to the sign in page', async () => {
    render(
      <MemoryRouter initialEntries={['/minha-conta']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  });
  it('waits for initialization before deciding whether to redirect', () => {
    mocks.state.status = 'initializing';
    render(
      <MemoryRouter initialEntries={['/minha-conta']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Carregando sua conta');
    expect(screen.queryByRole('heading', { name: 'Entre na sua conta' })).not.toBeInTheDocument();
  });
  it('does not mistake a failed profile read for a new account', () => {
    Object.assign(mocks.state, {
      status: 'authenticated',
      user: { uid: 'user-a' },
      profileStatus: 'error',
      profileError: 'Sem permissão.',
    });
    render(
      <MemoryRouter initialEntries={['/minha-conta']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão.');
    expect(screen.queryByRole('heading', { name: 'Vincule seu jogador' })).not.toBeInTheDocument();
  });
  it('keeps the linking form mounted while a link request is pending', () => {
    Object.assign(mocks.state, {
      status: 'authenticated',
      user: { uid: 'user-a' },
      profileStatus: 'ready',
      pending: true,
    });
    render(
      <MemoryRouter initialEntries={['/vincular-jogador']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Tag do jogador')).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Vincule seu jogador' })).toBeVisible();
  });
});
