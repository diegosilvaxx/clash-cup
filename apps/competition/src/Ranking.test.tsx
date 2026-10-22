// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ranking } from './Ranking';
const mocks = vi.hoisted(() => ({ ranking: vi.fn() }));
vi.mock('@clash-cup/rewards', async (original) => ({
  ...(await original<typeof import('@clash-cup/rewards')>()),
  rewards: mocks,
}));
const row = { tag: '#AAA', name: 'Player', clan: null, score: 0 };
beforeEach(() =>
  mocks.ranking.mockReset().mockResolvedValue({
    current: [row],
    history: [
      { ...row, score: 3, month: 1, year: 2026 },
      { ...row, score: 2, month: 2, year: 2026 },
    ],
    badges: {},
    invalid: 0,
    badgesUnavailable: false,
  }),
);
afterEach(cleanup);
function mount() {
  return render(
    <MemoryRouter>
      <Ranking />
    </MemoryRouter>,
  );
}
describe('public rankings', () => {
  it('shows a single zero-score participant and aggregates/filter histories', async () => {
    mount();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('0')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Classificação'), { target: { value: 'year' } });
    expect(within(table).getByText('5')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Classificação'), { target: { value: 'month' } });
    expect(screen.getByLabelText('Período')).toHaveValue('2026-02');
    expect(within(table).getByText('2')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '2026-01' } });
    expect(within(table).getByText('3')).toBeVisible();
    expect(mocks.ranking).toHaveBeenCalledTimes(1);
  });
  it('recovers read failures and displays an empty classification', async () => {
    mocks.ranking.mockRejectedValueOnce(new Error('failed')).mockResolvedValue({
      current: [],
      history: [],
      badges: {},
      invalid: 0,
      badgesUnavailable: true,
    });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText('Nenhum resultado disponível para esta classificação.'),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('emblemas');
  });
  it('paginates and shares the same position for tied scores', async () => {
    mocks.ranking.mockResolvedValue({
      current: Array.from({ length: 26 }, (_, i) => ({
        ...row,
        tag: `#A${String(i).padStart(2, '0')}`,
        name: `Player ${i}`,
      })),
      history: [],
      badges: {},
      invalid: 0,
      badgesUnavailable: false,
    });
    mount();
    expect(await screen.findByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getAllByText('1º')).toHaveLength(25);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByRole('status')).toHaveTextContent('Página 2 de 2');
    expect(screen.getAllByText('1º')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});
