import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from 'firebase-admin/auth';
import { createAdminDatabase } from '../../../tests/helpers/admin-database';
import { createAdminService } from './admin-service';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'server-time' },
  getFirestore: vi.fn(),
}));
const principal = { uid: 'admin-user', superAdmin: true };
const period = { tag: '#CUP', year: 2026, month: 10 };
const member = { tag: '#P0Y', name: 'Player', score: 3 };
function fixture(members = [member]) {
  const store = createAdminDatabase({
    'tournament/cup': {
      id: 'legacy-id',
      name: 'Cup',
      vacancies: '10',
      vacanciesAvailable: '2',
      tournamentLink: '',
    },
    'playerProfiles/player': { uid: 'player', idClashRoyale: '#P0Y' },
    'shop/#P0Y': {
      idClashRoyale: '#P0Y',
      gold: 10,
      emotesBuy: ['retired'],
      use: 'retired',
      customField: 'preserved',
    },
    'ranking/#P0Y': { tag: '#P0Y', name: 'Player', score: 5 },
    'rankingHistory/#P0Y_10_2026': { tag: '#P0Y', name: 'Player', score: 2, month: 10, year: 2026 },
  });
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      uid: 'player',
      emailVerified: true,
      email: 'player@example.test',
      customClaims: {},
    }),
    getUserByEmail: vi.fn(),
    listUsers: vi.fn(),
    setCustomUserClaims: vi.fn(),
    revokeRefreshTokens: vi.fn(),
  };
  const clash = {
    player: vi.fn(),
    upcomingChests: vi.fn(),
    tournament: vi
      .fn()
      .mockResolvedValue({ tag: '#CUP', name: 'Copa', status: 'ended', membersList: members }),
  };
  const service = createAdminService(clash, () => ({
    database: store.database,
    auth: auth as unknown as Auth,
  }));
  return { store, auth, clash, service };
}
beforeEach(() => vi.clearAllMocks());
describe('administrative tournament and wallet operations', () => {
  it('preserves legacy ids and occupied seats when editing', async () => {
    const { service, store } = fixture();
    await service.saveTournament(
      principal,
      {
        id: 'cup',
        name: 'Updated',
        description: '',
        date: '',
        tournamentLink: '',
        vacancies: 3,
        status: 'closed',
      },
      false,
    );
    expect(store.records.get('tournament/cup')).toMatchObject({
      id: 'legacy-id',
      vacanciesAvailable: '2',
      vacancies: 3,
      status: 'closed',
    });
    await expect(
      service.saveTournament(
        principal,
        {
          id: 'cup',
          name: 'Updated',
          description: '',
          date: '',
          tournamentLink: '',
          vacancies: 1,
          status: 'open',
        },
        false,
      ),
    ).rejects.toThrow('capacidade');
  });
  it('checks current occupancy after a concurrent registration and avoids duplicate creation', async () => {
    const { service, store } = fixture();
    store.conflictOnce(() =>
      store.seed('tournament/cup', {
        ...store.records.get('tournament/cup'),
        vacanciesAvailable: 4,
      }),
    );
    const draft = {
      id: 'cup',
      name: 'Updated',
      description: '',
      date: '',
      tournamentLink: '',
      vacancies: 3,
      status: 'closed' as const,
    };
    await expect(service.saveTournament(principal, draft, false)).rejects.toThrow('capacidade');
    await expect(service.saveTournament(principal, draft, true)).rejects.toThrow('já foi criado');
    expect(store.getCommits()).toBe(0);
  });
  it('binds a verified account without changing its gold or emblems', async () => {
    const { service, store } = fixture();
    const input = {
      walletId: '#P0Y',
      uid: 'player',
      reason: 'Titularidade confirmada',
      verifiedOwnership: true as const,
    };
    await service.bindWallet(principal, input);
    expect(store.records.get('shop/#P0Y')).toMatchObject({
      ownerUid: 'player',
      gold: 10,
      emotesBuy: ['retired'],
      use: 'retired',
    });
    await service.bindWallet(principal, input);
    expect(store.getCommits()).toBe(1);
  });
  it('rejects wrong tags and reassignment of an already owned wallet', async () => {
    const { service, store } = fixture();
    const input = {
      walletId: '#P0Y',
      uid: 'player',
      reason: 'Verificação manual',
      verifiedOwnership: true as const,
    };
    store.seed('playerProfiles/player', { uid: 'player', idClashRoyale: '#OTHER' });
    await expect(service.bindWallet(principal, input)).rejects.toThrow('não corresponde');
    store.seed('playerProfiles/player', { uid: 'player', idClashRoyale: '#P0Y' });
    store.seed('shop/#P0Y', { ...store.records.get('shop/#P0Y'), ownerUid: 'another' });
    await expect(service.bindWallet(principal, input)).rejects.toThrow('outra conta');
    expect(store.getCommits()).toBe(0);
  });
});
describe('resumable and idempotent result imports', () => {
  it('credits ranking, monthly history and gold exactly once, preserving ownership fields', async () => {
    const { service, store, clash } = fixture();
    const preview = await service.preview(period);
    const job = await service.startImport(principal, {
      ...period,
      fingerprint: preview.fingerprint,
    });
    expect(job.processed).toBe(0);
    expect(store.records.get('shop/#P0Y')?.gold).toBe(10);
    const finished = await service.processImport(principal, job.id);
    expect(finished).toMatchObject({ status: 'completed', processed: 1 });
    expect(store.records.get('shop/#P0Y')).toMatchObject({
      gold: 13,
      emotesBuy: ['retired'],
      use: 'retired',
      customField: 'preserved',
    });
    expect(store.records.get('ranking/#P0Y')?.score).toBe(8);
    expect(store.records.get('rankingHistory/#P0Y_10_2026')?.score).toBe(5);
    expect(store.records.has('resultImports/CUP/players/#P0Y')).toBe(true);
    const calls = clash.tournament.mock.calls.length;
    await service.processImport(principal, job.id);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    expect(clash.tournament).toHaveBeenCalledTimes(calls);
    expect(store.records.get('shop/#P0Y')?.gold).toBe(13);
    await expect(service.preview({ ...period, month: 11 })).rejects.toThrow('outro período');
  });
  it('records zero scores and resumes after a bounded batch', async () => {
    const members = Array.from({ length: 6 }, (_, i) => ({
      tag: `#A0${i}`,
      name: `Player ${i}`,
      score: 0,
    }));
    const { service, store } = fixture(members);
    const preview = await service.preview(period);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    expect(await service.processImport(principal, 'CUP')).toMatchObject({
      processed: 5,
      status: 'processing',
    });
    expect(await service.processImport(principal, 'CUP')).toMatchObject({
      processed: 6,
      status: 'completed',
    });
    expect(store.records.get('shop/#A00')?.gold).toBe(0);
    expect(store.records.get('shop/#A00')).not.toHaveProperty('ownerUid');
  });
  it('does not duplicate points when two administrators process the same batch', async () => {
    const { service, store } = fixture();
    const preview = await service.preview(period);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    await Promise.all([
      service.processImport(principal, 'CUP'),
      service.processImport(principal, 'CUP'),
    ]);
    expect(store.records.get('shop/#P0Y')?.gold).toBe(13);
    expect(store.records.get('resultImports/CUP')?.processed).toBe(1);
  });
  it('retries against the balance left by a simultaneous purchase', async () => {
    const { service, store } = fixture();
    const preview = await service.preview(period);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    store.conflictOnce(() =>
      store.seed('shop/#P0Y', { ...store.records.get('shop/#P0Y'), gold: 0 }),
    );
    await service.processImport(principal, 'CUP');
    expect(store.records.get('shop/#P0Y')?.gold).toBe(3);
  });
  it('never leaves a partial player credit after a failed commit, and allows retry', async () => {
    const { service, store } = fixture();
    const preview = await service.preview(period);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    store.failNextCommit();
    await expect(service.processImport(principal, 'CUP')).rejects.toThrow('commit failure');
    expect(store.records.get('shop/#P0Y')?.gold).toBe(10);
    expect(store.records.get('ranking/#P0Y')?.score).toBe(5);
    expect(store.records.has('resultImports/CUP/players/#P0Y')).toBe(false);
    await service.processImport(principal, 'CUP');
    expect(store.records.get('shop/#P0Y')?.gold).toBe(13);
  });
  it('refuses duplicate legacy wallets without crediting anything for that player', async () => {
    const { service, store } = fixture();
    const preview = await service.preview(period);
    await service.startImport(principal, { ...period, fingerprint: preview.fingerprint });
    store.seed('shop/duplicate', { idClashRoyale: '#P0Y', gold: 10 });
    await expect(service.processImport(principal, 'CUP')).rejects.toThrow('duplicados');
    expect(store.records.get('ranking/#P0Y')?.score).toBe(5);
    expect(store.records.get('resultImports/CUP')?.processed).toBe(0);
  });
  it('rejects a changed snapshot at confirmation and never starts an active tournament', async () => {
    const { service, clash, store } = fixture();
    const preview = await service.preview(period);
    clash.tournament.mockResolvedValue({
      tag: '#CUP',
      name: 'Cup',
      status: 'ended',
      membersList: [{ ...member, score: 7 }],
    });
    await expect(
      service.startImport(principal, { ...period, fingerprint: preview.fingerprint }),
    ).rejects.toThrow('mudou após');
    clash.tournament.mockResolvedValue({
      tag: '#CUP',
      name: 'Cup',
      status: 'inProgress',
      membersList: [member],
    });
    await expect(service.preview(period)).rejects.toThrow('encerrado');
    expect(store.records.has('resultImports/CUP')).toBe(false);
  });
});
describe('role management', () => {
  it('requires a responsible administrator and protects responsible/self accounts', async () => {
    const { service, auth } = fixture();
    await expect(
      service.changeRole({ ...principal, superAdmin: false }, 'user@example.test', 'grant'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(service.listRoles({ ...principal, superAdmin: false })).rejects.toMatchObject({
      status: 403,
    });
    auth.getUserByEmail.mockResolvedValue({ uid: principal.uid });
    await expect(service.changeRole(principal, 'self@example.test', 'revoke')).rejects.toThrow(
      'responsável',
    );
    auth.getUserByEmail.mockResolvedValue({ uid: 'other', customClaims: { superAdmin: true } });
    await expect(service.changeRole(principal, 'other@example.test', 'revoke')).rejects.toThrow(
      'responsável',
    );
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });
  it('preserves unrelated claims and revokes old sessions when removing access', async () => {
    const { service, auth, store } = fixture();
    auth.getUserByEmail.mockResolvedValue({
      uid: 'other',
      customClaims: { admin: true, unrelated: 'kept' },
    });
    await service.changeRole(principal, 'other@example.test', 'revoke');
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('other', {
      admin: false,
      unrelated: 'kept',
    });
    expect(auth.revokeRefreshTokens).toHaveBeenCalledWith('other');
    expect(
      [...store.records.entries()].filter(([path]) => path.startsWith('adminAudit/'))[0]?.[1],
    ).toMatchObject({ status: 'completed', action: 'role.revoke' });
  });
});
