// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@clash-cup/session';
import { App } from './App';
const mocks = vi.hoisted(() => ({
  state: {} as SessionSnapshot,
  profile: vi.fn(),
  chests: vi.fn(),
  retry: vi.fn(),
}));
vi.mock('@clash-cup/session', () => ({
  useSession: () => mocks.state,
  session: { retryProfile: mocks.retry },
}));
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  playerClient: mocks,
}));
beforeEach(() => {
  mocks.state = {
    status: 'authenticated',
    user: { uid: 'a', email: 'player@example.test', emailVerified: true, displayName: null },
    profile: {
      uid: 'a',
      idUser: 'player@example.test',
      idClashRoyale: '#P0Y',
      nome: 'Player',
      source: 'current',
    },
    profileStatus: 'ready',
    profileError: null,
    pending: false,
    error: null,
  };
  mocks.profile
    .mockReset()
    .mockResolvedValue({ tag: '#P0Y', name: 'Player', trophies: 0, clan: null, currentDeck: [] });
  mocks.chests.mockReset().mockResolvedValue({ items: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
function mount(path = '/perfil') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/entrar" element={<h1>Login</h1>} />
        <Route path="/vincular-jogador" element={<h1>Vincular</h1>} />
        <Route path="*" element={<App />} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('player area', () => {
  it('waits for the session and does not query the game before login', () => {
    mocks.state.status = 'initializing';
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando sua conta');
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('redirects guests to login and accounts without a player to onboarding', () => {
    mocks.state.status = 'anonymous';
    mount();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeVisible();
    cleanup();
    mocks.state.status = 'authenticated';
    mocks.state.profile = null;
    mount();
    expect(screen.getByRole('heading', { name: 'Vincular' })).toBeVisible();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('does not mistake a profile permission error for a missing player', () => {
    mocks.state.profileStatus = 'error';
    mocks.state.profileError = 'Sem permissão';
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mocks.retry).toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('renders zero trophies and handles a missing clan, statistics and deck', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Player' })).toBeVisible();
    expect(screen.getByText('0', { exact: true })).toBeVisible();
    expect(screen.getByText('Sem clã', { exact: false })).toBeVisible();
    expect(screen.getByText('O deck atual não foi informado.')).toBeVisible();
    expect(mocks.chests).not.toHaveBeenCalled();
  });
  it('recovers a chest failure and handles an empty sequence', async () => {
    mocks.chests.mockRejectedValueOnce(new Error('failed'));
    mount('/baus');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText('Nenhum baú disponível para este jogador no momento.'),
    ).toBeVisible();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('keeps VIP informational without assuming membership or querying the game', () => {
    vi.stubEnv('VITE_VIP_SUPPORT_URL', 'javascript:alert(1)');
    mocks.state.status = 'anonymous';
    mocks.state.user = null;
    mount('/area-vip');
    expect(screen.getByRole('heading', { name: 'Área VIP' })).toBeVisible();
    expect(screen.getByText('As informações de apoio serão divulgadas em breve.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Conhecer as opções/ })).not.toBeInTheDocument();
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.chests).not.toHaveBeenCalled();
  });
});
