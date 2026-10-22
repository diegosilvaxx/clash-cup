import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerProfile, SessionUser } from '@clash-cup/session';
import { createCompetitionRepository, parseCompetition } from './index';

type RecordData = Record<string, unknown>;
const mocks = vi.hoisted(() => ({
  uid: 'user-a',
  data: new Map<string, RecordData>(),
  writes: [] as { kind: string; path: string; data?: RecordData }[],
  query: vi.fn(),
  conflict: false,
  sessionChange: false,
}));
vi.mock('@clash-cup/firebase', () => ({
  getFirebaseApp: () => ({}),
  getAuth: () => ({ currentUser: { uid: mocks.uid } }),
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  where: (...parts: unknown[]) => parts,
  query: (path: string) => path,
  getDocs: (...args: unknown[]) => mocks.query(...args),
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<unknown>) => {
    const transaction = {
      get: async (path: string) => {
        const value = mocks.data.get(path);
        if (mocks.sessionChange) mocks.uid = 'user-b';
        return { id: path.split('/').at(-1), exists: () => value !== undefined, data: () => value };
      },
      set: (path: string, data: RecordData) => mocks.writes.push({ kind: 'set', path, data }),
      update: (path: string, data: RecordData) => mocks.writes.push({ kind: 'update', path, data }),
      delete: (path: string) => mocks.writes.push({ kind: 'delete', path }),
    };
    const result = await action(transaction);
    if (mocks.conflict) {
      mocks.writes.length = 0;
      mocks.data.set('tournament/cup', {
        ...mocks.data.get('tournament/cup'),
        vacanciesAvailable: 1,
      });
      mocks.conflict = false;
      return action(transaction);
    }
    return result;
  },
}));
const user: SessionUser = {
  uid: 'user-a',
  email: 'player@example.test',
  emailVerified: true,
  displayName: null,
};
const profile: PlayerProfile = {
  uid: 'user-a',
  idUser: user.email!,
  idClashRoyale: '#P0Y',
  nome: 'Player',
  source: 'current',
};
const record = { name: 'Copa', id: 'legacy-date', vacancies: '1', vacanciesAvailable: '0' };
const repository = createCompetitionRepository();
beforeEach(() => {
  mocks.uid = user.uid;
  mocks.data.clear();
  mocks.writes.length = 0;
  mocks.conflict = false;
  mocks.sessionChange = false;
  mocks.data.set('tournament/cup', { ...record });
  mocks.query.mockResolvedValue({ docs: [] });
});
describe('transactional registrations', () => {
  it('reserves the last seat together with the registration', async () => {
    await expect(
      repository.join(user, profile, 'cup', [parseCompetition('cup', record)]),
    ).resolves.toBe('created');
    expect(mocks.writes).toEqual([
      {
        kind: 'set',
        path: 'competitionRegistrations/user-a/tournaments/cup',
        data: {
          uid: 'user-a',
          tournamentId: 'cup',
          idClashRoyale: '#P0Y',
          registeredAt: 'server-time',
        },
      },
      {
        kind: 'update',
        path: 'tournament/cup',
        data: {
          vacanciesAvailable: 1,
          lastRegistrationChange: { uid: 'user-a', kind: 'join', at: 'server-time' },
        },
      },
    ]);
  });
  it('does not increment the counter for a repeated registration', async () => {
    mocks.data.set('competitionRegistrations/user-a/tournaments/cup', { uid: 'user-a' });
    await expect(repository.join(user, profile, 'cup', [])).resolves.toBe('existing');
    expect(mocks.writes).toEqual([]);
  });
  it('rechecks capacity when a transaction is retried after a competing write', async () => {
    mocks.conflict = true;
    await expect(repository.join(user, profile, 'cup', [])).rejects.toThrow('esgotaram');
    expect(mocks.writes).toEqual([]);
  });
  it('refuses a full or closed tournament without writing', async () => {
    mocks.data.set('tournament/cup', { ...record, status: 'closed' });
    await expect(repository.join(user, profile, 'cup', [])).rejects.toThrow('encerradas');
    expect(mocks.writes).toEqual([]);
  });
  it('cancels and releases one seat, without negative counts on repeated cancellation', async () => {
    mocks.data.set('tournament/cup', { ...record, vacanciesAvailable: '1' });
    mocks.data.set('competitionRegistrations/user-a/tournaments/cup', { uid: 'user-a' });
    await expect(repository.cancel(user, 'cup')).resolves.toBe('cancelled');
    expect(mocks.writes).toContainEqual({
      kind: 'delete',
      path: 'competitionRegistrations/user-a/tournaments/cup',
    });
    expect(mocks.writes[0]?.data?.vacanciesAvailable).toBe(0);
    mocks.data.delete('competitionRegistrations/user-a/tournaments/cup');
    mocks.writes.length = 0;
    await expect(repository.cancel(user, 'cup')).resolves.toBe('absent');
    expect(mocks.writes).toEqual([]);
  });
  it('keeps inconsistent registrations for review instead of decrementing zero', async () => {
    mocks.data.set('competitionRegistrations/user-a/tournaments/cup', { uid: 'user-a' });
    await expect(repository.cancel(user, 'cup')).rejects.toThrow('revisada');
    expect(mocks.writes).toEqual([]);
  });
  it('removes an orphan without changing another tournament', async () => {
    mocks.data.delete('tournament/cup');
    mocks.data.set('competitionRegistrations/user-a/tournaments/cup', { uid: 'user-a' });
    await repository.cancel(user, 'cup');
    expect(mocks.writes).toEqual([
      { kind: 'delete', path: 'competitionRegistrations/user-a/tournaments/cup' },
    ]);
  });
  it('does not mutate data if the account changes during the reads', async () => {
    mocks.sessionChange = true;
    await expect(repository.join(user, profile, 'cup', [])).rejects.toThrow('sessão mudou');
    expect(mocks.writes).toEqual([]);
  });
  it('does not duplicate a legacy registration with an ambiguous tournament id', async () => {
    mocks.query.mockResolvedValue({
      docs: [{ id: 'old', data: () => ({ idTournament: 'legacy-date' }) }],
    });
    await expect(
      repository.join(user, profile, 'cup', [
        parseCompetition('cup', record),
        parseCompetition('other', record),
      ]),
    ).rejects.toThrow('inscrição antiga');
    expect(mocks.writes).toEqual([]);
  });
  it('never queries old email based registrations for an unverified email', async () => {
    await repository.registrations({ ...user, emailVerified: false }, []);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).toHaveBeenCalledWith('competitionRegistrations/user-a/tournaments');
  });
});
