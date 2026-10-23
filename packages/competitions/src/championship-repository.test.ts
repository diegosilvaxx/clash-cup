import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChampionship, type Championship } from './championship-model';
import { championships } from './championship-repository';
const mock = vi.hoisted(() => ({
  uid: 'owner',
  stored: null as Record<string, unknown> | null,
  writes: vi.fn(),
  fail: false,
  switchSession: false,
  query: vi.fn(),
}));
vi.mock('@clash-cup/firebase', () => ({
  getFirebaseApp: () => ({}),
  getFirestore: () => ({}),
  getAuth: () => ({ currentUser: { uid: mock.uid } }),
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, _collection?: string, id?: string) => ({ id: id ?? 'generated' }),
  getDoc: async () => ({ id: 'cup', exists: () => Boolean(mock.stored), data: () => mock.stored }),
  getDocs: (...args: unknown[]) => mock.query(...args),
  where: (...args: unknown[]) => args,
  query: (...args: unknown[]) => args,
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db: unknown, run: (tx: unknown) => Promise<void>) => {
    if (mock.fail) throw new Error('offline');
    await run({
      get: async () => {
        if (mock.switchSession) mock.uid = 'another';
        return { id: 'cup', exists: () => Boolean(mock.stored), data: () => mock.stored };
      },
      set: mock.writes,
    });
  },
}));
const input = () => ({ ...emptyChampionship(), name: 'Copa dos Reis' });
const previous = (): Championship => ({ ...input(), id: 'cup', ownerUid: 'owner', revision: 1 });
beforeEach(() => {
  mock.uid = 'owner';
  mock.stored = null;
  mock.writes.mockReset();
  mock.query.mockResolvedValue({ docs: [] });
  mock.fail = false;
  mock.switchSession = false;
});
describe('championship persistence', () => {
  it('creates a private draft using the authenticated owner and server timestamp', async () => {
    const saved = await championships.save('owner', input(), null);
    expect(saved).toMatchObject({
      id: 'generated',
      ownerUid: 'owner',
      revision: 1,
      status: 'draft',
    });
    expect(mock.writes).toHaveBeenCalledWith(
      { id: 'generated' },
      expect.objectContaining({ ownerUid: 'owner', revision: 1, updatedAt: 'server-time' }),
    );
  });
  it('refuses another owner, stale revision and changed session without writing', async () => {
    for (const stored of [
      { ...input(), ownerUid: 'other', revision: 1 },
      { ...input(), ownerUid: 'owner', revision: 2 },
    ]) {
      mock.stored = stored;
      await expect(championships.save('owner', input(), previous())).rejects.toThrow('outra aba');
    }
    mock.stored = { ...input(), ownerUid: 'owner', revision: 1 };
    mock.switchSession = true;
    await expect(championships.save('owner', input(), previous())).rejects.toThrow('sessão');
    expect(mock.writes).not.toHaveBeenCalled();
  });
  it('retains the local revision on a failed write', async () => {
    mock.fail = true;
    await expect(championships.save('owner', input(), null)).rejects.toThrow('offline');
    expect(mock.writes).not.toHaveBeenCalled();
  });
  it('queries only championships belonging to the signed-in account', async () => {
    await championships.list('owner');
    expect(mock.query).toHaveBeenCalledWith([
      'communityChampionships',
      ['ownerUid', '==', 'owner'],
    ]);
    await expect(championships.list('other')).rejects.toThrow('sessão');
  });
  it('locks the published roster while allowing valid score updates', async () => {
    const published = {
      ...input(),
      status: 'published' as const,
      players: Array.from({ length: 8 }, (_, i) => `Player ${i}`),
    };
    mock.stored = { ...published, ownerUid: 'owner', revision: 1 };
    const old = { ...published, id: 'cup', ownerUid: 'owner', revision: 1 };
    await expect(championships.save('owner', { ...published, name: 'Other' }, old)).rejects.toThrow(
      'só os placares',
    );
    expect(mock.writes).not.toHaveBeenCalled();
    await expect(
      championships.save('owner', { ...published, scores: { '0-0': [2, 0] } }, old),
    ).resolves.toMatchObject({ revision: 2 });
  });
});
