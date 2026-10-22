import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerProfile } from '@clash-cup/session';
import { createRewardRepository } from './index';
type Data = Record<string, unknown>;
const mocks = vi.hoisted(() => ({
  uid: 'a',
  data: new Map<string, Data>(),
  writes: [] as Data[],
  query: vi.fn(),
  sessionChange: false,
  retry: null as Data | null,
  fail: false,
}));
vi.mock('@clash-cup/firebase', () => ({
  getFirebaseApp: () => ({}),
  getFirestore: () => ({}),
  getAuth: () => ({ currentUser: { uid: mocks.uid } }),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  where: (...args: unknown[]) => args,
  query: (path: string) => path,
  getDocs: (path: string) => mocks.query(path),
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<unknown>) => {
    const writes: Data[] = [];
    const tx = {
      get: async (path: string) => {
        const value = mocks.data.get(path);
        if (mocks.sessionChange) mocks.uid = 'b';
        return { id: 'wallet', exists: () => value !== undefined, data: () => value };
      },
      update: (path: string, fields: Data) => writes.push({ path, fields }),
    };
    let result = await action(tx);
    if (mocks.retry) {
      mocks.data.set('shop/wallet', mocks.retry);
      mocks.retry = null;
      writes.length = 0;
      result = await action(tx);
    }
    if (mocks.fail) throw new Error('commit-failed');
    mocks.writes.push(...writes);
    return result;
  },
}));
const profile: PlayerProfile = {
  uid: 'a',
  idUser: 'a@example.test',
  idClashRoyale: '#P0Y',
  nome: 'Player',
  source: 'current',
};
const initial = {
  ownerUid: 'a',
  idClashRoyale: '#P0Y',
  gold: 10,
  emotesBuy: [],
  use: '',
  legacyMetadata: 'preserved',
};
const repository = createRewardRepository();
beforeEach(() => {
  mocks.uid = 'a';
  mocks.sessionChange = false;
  mocks.retry = null;
  mocks.fail = false;
  mocks.data.clear();
  mocks.data.set('shop/wallet', { ...initial });
  mocks.writes.length = 0;
  mocks.query.mockReset().mockResolvedValue({ docs: [] });
});
describe('atomic shop purchases', () => {
  it('spends the exact balance and acquires/equips with one partial update', async () => {
    const result = await repository.change(profile, 'wallet', 'angry', 'buy');
    expect(result.gold).toBe(0);
    expect(mocks.writes).toEqual([
      {
        path: 'shop/wallet',
        fields: { gold: 0, emotesBuy: ['angry'], use: 'angry', lastUpdated: 'server-time' },
      },
    ]);
  });
  it('never charges a previously owned item, even after an uncertain retry', async () => {
    mocks.data.set('shop/wallet', { ...initial, gold: 0, emotesBuy: ['angry'], use: 'angry' });
    expect((await repository.change(profile, 'wallet', 'angry', 'buy')).gold).toBe(0);
    expect(mocks.writes).toEqual([]);
  });
  it('registers ownership of the free item and can equip an owned event item', async () => {
    expect((await repository.change(profile, 'wallet', 'juggling', 'buy')).emotesBuy).toEqual([
      'juggling',
    ]);
    mocks.data.set('shop/wallet', { ...initial, emotesBuy: ['kingbelt'] });
    expect((await repository.change(profile, 'wallet', 'kingbelt', 'equip')).gold).toBe(10);
  });
  it.each([
    ['basketball', 'buy', 'insuficiente'],
    ['kingbelt', 'buy', 'eventos'],
    ['angry', 'equip', 'não possui'],
    ['unknown', 'buy', 'não está disponível'],
  ] as const)('refuses %s/%s without writes', async (id, action, message) => {
    await expect(repository.change(profile, 'wallet', id, action)).rejects.toThrow(message);
    expect(mocks.writes).toEqual([]);
  });
  it.each([undefined, 'another-user'])(
    'requires administrator binding, not only a matching tag (%s)',
    async (ownerUid) => {
      mocks.data.set('shop/wallet', { ...initial, ownerUid });
      await expect(repository.change(profile, 'wallet', 'angry', 'buy')).rejects.toThrow(
        'associado',
      );
      expect(mocks.writes).toEqual([]);
    },
  );
  it('rechecks the latest balance after a conflicting purchase', async () => {
    mocks.retry = { ...initial, gold: 5, emotesBuy: ['blow'] };
    await expect(repository.change(profile, 'wallet', 'angry', 'buy')).rejects.toThrow(
      'insuficiente',
    );
    expect(mocks.writes).toEqual([]);
  });
  it('does not charge twice when a concurrent transaction acquired the same emblem', async () => {
    mocks.retry = { ...initial, gold: 0, emotesBuy: ['angry'], use: 'angry' };
    expect((await repository.change(profile, 'wallet', 'angry', 'buy')).gold).toBe(0);
    expect(mocks.writes).toEqual([]);
  });
  it('does not write after an account change or report a failed commit as success', async () => {
    mocks.sessionChange = true;
    await expect(repository.change(profile, 'wallet', 'angry', 'buy')).rejects.toThrow(
      'sessão mudou',
    );
    mocks.sessionChange = false;
    mocks.uid = 'a';
    mocks.fail = true;
    await expect(repository.change(profile, 'wallet', 'angry', 'buy')).rejects.toThrow(
      'commit-failed',
    );
    expect(mocks.writes).toEqual([]);
  });
  it('rejects duplicate wallets rather than selecting an arbitrary account', async () => {
    mocks.query.mockResolvedValue({ docs: [{}, {}] });
    await expect(repository.wallet(profile)).rejects.toThrow('mais de um saldo');
  });
  it('keeps standings available if only badge loading fails', async () => {
    mocks.query.mockImplementation((path: string) =>
      path === 'shop' ? Promise.reject(new Error('denied')) : Promise.resolve({ docs: [] }),
    );
    expect(await repository.ranking()).toMatchObject({
      current: [],
      history: [],
      badgesUnavailable: true,
    });
  });
});
