// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './Home';

const mocks = vi.hoisted(() => ({ list: vi.fn(), ranking: vi.fn() }));
vi.mock('@clash-cup/competitions', () => ({ competitions: { list: mocks.list } }));
vi.mock('@clash-cup/rewards', async () => ({
  ...(await vi.importActual<typeof import('@clash-cup/rewards')>('@clash-cup/rewards')),
  rewards: { ranking: mocks.ranking },
}));
const tournament = {
  id: 'cup',
  name: 'Copa da comunidade',
  description: 'Batalhas da comunidade.',
  date: '2026-11-15T20:00',
  capacity: 64,
  occupied: 48,
  remaining: 16,
  open: true,
  legacyId: null,
  link: null,
};
const ranking = {
  current: [
    { tag: '#AAA', name: 'Líder real', clan: null, score: 150 },
    { tag: '#P0Y', name: 'Jogador real', clan: null, score: 0 },
  ],
  history: [],
  badges: {},
  invalid: 0,
  badgesUnavailable: false,
};
beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue({ items: [tournament], invalid: 0 });
  mocks.ranking.mockReset().mockResolvedValue(ranking);
});
afterEach(cleanup);
function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('community home', () => {
  it('shows actual tournaments, available seats and current standings', async () => {
    renderHome();
    expect(await screen.findByRole('link', { name: 'Copa da comunidade' })).toHaveAttribute(
      'href',
      '/torneios/cup',
    );
    expect(screen.getByText('48 / 64 jogadores')).toBeVisible();
    const standings = screen.getByRole('region', { name: 'Ranking da temporada' });
    expect(await within(standings).findByText('Líder real')).toBeVisible();
    expect(mocks.ranking).toHaveBeenCalledWith({ history: false, badges: false, force: false });
    expect(within(standings).getByText('0 pts')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '48');
  });
  it('shows empty states rather than illustrative tournament or player data', async () => {
    mocks.list.mockResolvedValue({ items: [], invalid: 0 });
    mocks.ranking.mockResolvedValue({ ...ranking, current: [] });
    renderHome();
    expect(await screen.findByText('A próxima disputa vem aí.')).toBeVisible();
    expect(await screen.findByText(/quando os primeiros resultados/)).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Ver torneio' })).not.toBeInTheDocument();
  });
  it('keeps ranking usable when tournaments fail and recovers with retry', async () => {
    mocks.list
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue({ items: [tournament] });
    renderHome();
    expect(
      await screen.findByText('Não foi possível carregar os torneios em destaque.'),
    ).toBeVisible();
    expect(await screen.findByText('Líder real')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar destaques' }));
    expect(await screen.findByRole('link', { name: 'Copa da comunidade' })).toBeVisible();
  });
  it('keeps tournaments usable when ranking fails', async () => {
    mocks.ranking.mockRejectedValue(new Error('unavailable'));
    renderHome();
    expect(await screen.findByRole('link', { name: 'Copa da comunidade' })).toBeVisible();
    expect(await screen.findByText('O ranking está indisponível no momento.')).toBeVisible();
  });
});
