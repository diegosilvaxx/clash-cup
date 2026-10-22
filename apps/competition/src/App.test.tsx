// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@clash-cup/session';
import { App } from './App';

const mocks = vi.hoisted(() => ({
  state: {} as SessionSnapshot,
  list: vi.fn(),
  registrations: vi.fn(),
  join: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@clash-cup/session', () => ({
  useSession: () => mocks.state,
  session: { getSnapshot: () => mocks.state },
}));
vi.mock('@clash-cup/competitions', () => ({
  competitions: mocks,
  competitionError: () => 'Não foi possível salvar a inscrição.',
}));
const competition = {
  id: 'cup',
  legacyId: 'day',
  name: 'Copa',
  date: '',
  capacity: 1,
  occupied: 0,
  remaining: 1,
  description: '',
  link: null,
  open: true,
};
beforeEach(() => {
  mocks.state = {
    status: 'authenticated',
    user: { uid: 'user-a', email: 'player@example.test', emailVerified: true, displayName: null },
    profile: {
      uid: 'user-a',
      idUser: 'player@example.test',
      nome: 'Player',
      idClashRoyale: '#P0Y',
      source: 'current',
    },
    profileStatus: 'ready',
    profileError: null,
    pending: false,
    error: null,
  };
  mocks.list.mockResolvedValue({ items: [competition], invalid: 0 });
  mocks.registrations.mockResolvedValue([]);
  mocks.join.mockReset();
  mocks.cancel.mockReset();
});
afterEach(cleanup);
function mount(path = '/torneios/cup') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
describe('competition interface', () => {
  it('allows public browsing and offers sign in before joining', async () => {
    mocks.state = { ...mocks.state, user: null, profile: null, status: 'anonymous' };
    mount();
    expect(await screen.findByRole('heading', { name: 'Copa' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute(
      'href',
      '/entrar',
    );
    expect(mocks.registrations).not.toHaveBeenCalled();
  });
  it('disables repeated actions until a join finishes and preserves confirmation after refresh', async () => {
    let finish!: () => void;
    mocks.join.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    mount();
    const join = await screen.findByRole('button', { name: 'Inscrever-se' });
    fireEvent.click(join);
    fireEvent.click(join);
    expect(mocks.join).toHaveBeenCalledTimes(1);
    expect(join).toBeDisabled();
    mocks.registrations.mockResolvedValue([
      { id: 'cup', tournamentId: 'cup', legacyId: null, source: 'current', problem: null },
    ]);
    finish();
    expect(await screen.findByRole('button', { name: 'Cancelar inscrição' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Inscrição confirmada.');
  });
  it('shows a write failure without pretending to consume a seat', async () => {
    mocks.join.mockRejectedValue(new Error('failed'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Inscrever-se' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    expect(screen.getByText('0 de 1 vagas ocupadas · 1 disponíveis')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Inscrever-se' })).toBeEnabled();
  });
  it('does not expose another user registrations while a stale read is finishing', async () => {
    let finish!: (value: unknown[]) => void;
    mocks.registrations.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = mount('/meus-torneios');
    await waitFor(() => expect(mocks.registrations).toHaveBeenCalled());
    mocks.state = { ...mocks.state, status: 'anonymous', user: null, profile: null };
    view.rerender(
      <MemoryRouter initialEntries={['/meus-torneios']}>
        <App />
      </MemoryRouter>,
    );
    finish([{ id: 'cup', tournamentId: 'cup', source: 'current' }]);
    await waitFor(() => expect(screen.queryByText('Inscrição confirmada')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Meus torneios' })).not.toBeInTheDocument();
  });
});
