// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerProfile } from '@clash-cup/session';
import type { Wallet } from '@clash-cup/rewards';
import { Shop } from './Shop';
const mocks = vi.hoisted(() => ({ wallet: vi.fn(), change: vi.fn(), uid: 'a' }));
vi.mock('@clash-cup/session', () => ({
  session: { getSnapshot: () => ({ user: { uid: mocks.uid } }) },
}));
vi.mock('@clash-cup/rewards', async (original) => ({
  ...(await original<typeof import('@clash-cup/rewards')>()),
  rewards: mocks,
}));
const profile: PlayerProfile = {
  uid: 'a',
  idClashRoyale: '#P0Y',
  idUser: 'a@example.test',
  nome: 'Player',
  source: 'current',
};
const wallet: Wallet = {
  id: 'wallet',
  ownerUid: 'a',
  idClashRoyale: '#P0Y',
  gold: 10,
  emotesBuy: [],
  use: '',
};
beforeEach(() => {
  mocks.uid = 'a';
  mocks.wallet.mockReset().mockResolvedValue(wallet);
  mocks.change.mockReset();
});
afterEach(cleanup);
function mount(path = '/loja') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Shop profile={profile} />
    </MemoryRouter>,
  );
}
describe('shop feedback and ownership', () => {
  it('keeps an unclaimed legacy balance read-only', async () => {
    mocks.wallet.mockResolvedValue({ ...wallet, ownerUid: undefined });
    mount();
    expect(await screen.findByText(/Seu saldo anterior está preservado/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adquirir: Princesa zangada' })).toBeDisabled();
    expect(mocks.change).not.toHaveBeenCalled();
  });
  it('does not confirm or deduct before commit, blocks double clicks, and retains balance after failure', async () => {
    let reject!: (error: unknown) => void;
    mocks.change.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    mount();
    const button = await screen.findByRole('button', { name: 'Adquirir: Princesa zangada' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Seu saldo: 10 Gold' })).toBeVisible();
    expect(screen.queryByText('Emblema adquirido e equipado.')).not.toBeInTheDocument();
    await act(async () => reject(new Error('private payload')));
    expect(screen.getByRole('alert')).not.toHaveTextContent('private');
    expect(screen.getByRole('heading', { name: 'Seu saldo: 10 Gold' })).toBeVisible();
    expect(button).toBeEnabled();
  });
  it('shows committed balance and the acquired item without another debit', async () => {
    mocks.change.mockResolvedValue({ ...wallet, gold: 0, emotesBuy: ['angry'], use: 'angry' });
    mount();
    const button = await screen.findByRole('button', { name: 'Adquirir: Princesa zangada' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Emblema adquirido e equipado.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Seu saldo: 0 Gold' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Equipado: Princesa zangada' })).toBeDisabled();
  });
  it('shows only owned catalog items, preserving unknown legacy items', async () => {
    mocks.wallet.mockResolvedValue({ ...wallet, emotesBuy: ['angry', 'retired'] });
    mount('/meus-emblemas');
    expect(
      await screen.findByText(
        'Você também possui emblemas antigos que aguardam revisão do catálogo. Eles permanecem salvos.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('list', { name: 'Emblemas adquiridos' }).children).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Equipar: Princesa zangada' })).toBeEnabled();
  });
  it('ignores a late result after sign out and retries a read error', async () => {
    mocks.wallet.mockRejectedValueOnce(new Error('failed')).mockResolvedValue(wallet);
    let resolve!: (value: Wallet) => void;
    mocks.change.mockReturnValue(
      new Promise<Wallet>((done) => {
        resolve = done;
      }),
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    const button = await screen.findByRole('button', { name: 'Adquirir: Princesa zangada' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    mocks.uid = 'b';
    await act(async () => resolve({ ...wallet, gold: 0 }));
    expect(screen.queryByText('Emblema adquirido e equipado.')).not.toBeInTheDocument();
  });
});
