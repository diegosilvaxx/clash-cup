import { describe, expect, it, vi } from 'vitest';
import { createSessionStore } from './store';
import { SessionError } from './errors';
import type { PlayerProfile, SessionDriver, SessionUser } from './types';

const user: SessionUser = {
  uid: 'user-a',
  email: 'player@example.test',
  emailVerified: true,
  displayName: 'Player',
};
const profile: PlayerProfile = {
  uid: user.uid,
  idUser: user.email!,
  idClashRoyale: '#P0Y',
  nome: 'Player',
  source: 'current',
};
function fixture() {
  let emit: (user: SessionUser | null) => void = () => undefined;
  let fail: (error: unknown) => void = () => undefined;
  const driver = {
    start: vi.fn(
      async (listener: (user: SessionUser | null) => void, onError: (error: unknown) => void) => {
        emit = listener;
        fail = onError;
        listener(null);
      },
    ),
    signIn: vi.fn<SessionDriver['signIn']>().mockResolvedValue(undefined),
    signUp: vi.fn<SessionDriver['signUp']>().mockResolvedValue(undefined),
    google: vi.fn<SessionDriver['google']>().mockResolvedValue(undefined),
    signOut: vi.fn<SessionDriver['signOut']>().mockImplementation(async () => {
      emit(null);
    }),
    loadProfile: vi.fn<SessionDriver['loadProfile']>().mockResolvedValue(null),
    linkPlayer: vi.fn<SessionDriver['linkPlayer']>().mockResolvedValue(profile),
  };
  return {
    driver,
    store: createSessionStore(driver),
    emit: (user: SessionUser | null) => emit(user),
    fail: (error: unknown) => fail(error),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('shared session store', () => {
  it('initializes once for multiple consumers and publishes the session', async () => {
    const { store, driver, emit } = fixture();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await Promise.all([store.start(), store.start()]);
    expect(driver.start).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe('anonymous');
    emit(user);
    await vi.waitFor(() => expect(store.getSnapshot().profileStatus).toBe('ready'));
    expect(store.getSnapshot().user).toEqual(user);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
  it('keeps startup recoverable when configuration is missing', async () => {
    const { store, driver } = fixture();
    driver.start.mockRejectedValueOnce(
      new SessionError('configuration-missing', 'Configuração pendente.'),
    );
    await store.start();
    expect(store.getSnapshot().status).toBe('unconfigured');
    await store.start();
    expect(store.getSnapshot().status).toBe('anonymous');
  });
  it('allows retry after a session observer failure', async () => {
    const { store, fail, driver } = fixture();
    await store.start();
    fail(new Error('private SDK error'));
    expect(store.getSnapshot().status).toBe('error');
    expect(store.getSnapshot().error).not.toContain('private');
    await store.start();
    expect(driver.start).toHaveBeenCalledTimes(2);
  });
  it('does not replace the second user profile with a delayed first user response', async () => {
    const { store, driver, emit } = fixture();
    const first = deferred<PlayerProfile | null>();
    driver.loadProfile
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ...profile, uid: 'user-b', nome: 'Second' });
    await store.start();
    emit(user);
    emit({ ...user, uid: 'user-b' });
    await vi.waitFor(() => expect(store.getSnapshot().profile?.nome).toBe('Second'));
    first.resolve(profile);
    await first.promise;
    expect(store.getSnapshot().profile?.uid).toBe('user-b');
  });
  it('clears private data on sign out and ignores pending profile loads', async () => {
    const { store, driver, emit } = fixture();
    const loading = deferred<PlayerProfile | null>();
    driver.loadProfile.mockReturnValueOnce(loading.promise);
    await store.start();
    emit(user);
    await store.signOut();
    loading.resolve(profile);
    await loading.promise;
    expect(store.getSnapshot()).toMatchObject({
      status: 'anonymous',
      user: null,
      profile: null,
      profileStatus: 'idle',
    });
  });
  it('distinguishes an absent profile from a failed read, and supports retry', async () => {
    const { store, driver, emit } = fixture();
    driver.loadProfile
      .mockRejectedValueOnce(new Error('private database details'))
      .mockResolvedValueOnce(profile);
    await store.start();
    emit(user);
    await vi.waitFor(() => expect(store.getSnapshot().profileStatus).toBe('error'));
    await expect(store.linkPlayer('P0Y')).rejects.toThrow('Aguarde');
    expect(driver.linkPlayer).not.toHaveBeenCalled();
    await store.retryProfile();
    expect(store.getSnapshot().profile).toEqual(profile);
  });
  it('blocks duplicate operations and restores pending state after failure', async () => {
    const { store, driver } = fixture();
    const signingIn = deferred<void>();
    driver.signIn
      .mockReturnValueOnce(signingIn.promise)
      .mockRejectedValueOnce({ code: 'auth/invalid-credential', message: 'raw SDK details' });
    await store.start();
    const first = store.signIn('player@example.test', 'password');
    expect(store.getSnapshot().pending).toBe(true);
    await expect(store.google()).rejects.toThrow('Aguarde');
    expect(driver.google).not.toHaveBeenCalled();
    signingIn.resolve();
    await first;
    await expect(store.signIn('player@example.test', 'wrong')).rejects.toThrow(
      'Email ou senha inválidos.',
    );
    expect(store.getSnapshot().pending).toBe(false);
    expect(store.getSnapshot().error).not.toContain('raw');
  });
  it('links only a signed-in user with a successfully loaded empty profile', async () => {
    const { store, emit, driver } = fixture();
    await store.start();
    await expect(store.linkPlayer('P0Y')).rejects.toThrow('Entre');
    emit(user);
    await vi.waitFor(() => expect(store.getSnapshot().profileStatus).toBe('ready'));
    await store.linkPlayer('P0Y');
    expect(driver.linkPlayer).toHaveBeenCalledWith(user, 'P0Y');
    expect(store.getSnapshot().profile).toEqual(profile);
    await expect(store.linkPlayer('Q0Y')).rejects.toThrow('já possui');
  });
});
