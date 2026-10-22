import { getSessionError, SessionError } from './errors';
import type { SessionDriver, SessionSnapshot, SessionUser } from './types';

export function createSessionStore(driver: SessionDriver) {
  let snapshot: SessionSnapshot = {
    status: 'initializing',
    user: null,
    profile: null,
    profileStatus: 'idle',
    profileError: null,
    pending: false,
    error: null,
  };
  const listeners = new Set<() => void>();
  let started = false;
  let revision = 0;
  function publish(update: Partial<SessionSnapshot>) {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  }
  async function loadProfile(user: SessionUser) {
    const current = ++revision;
    publish({ profile: null, profileStatus: 'loading', profileError: null });
    try {
      const profile = await driver.loadProfile(user);
      if (revision === current) publish({ profile, profileStatus: 'ready' });
    } catch (error) {
      if (revision === current)
        publish({ profile: null, profileStatus: 'error', profileError: getSessionError(error) });
    }
  }
  async function perform(action: () => Promise<void>) {
    if (snapshot.pending) throw new SessionError('busy', 'Aguarde a operação em andamento.');
    publish({ pending: true, error: null });
    try {
      await action();
    } catch (error) {
      const message = getSessionError(error);
      publish({ error: message });
      throw new SessionError('operation-failed', message);
    } finally {
      publish({ pending: false });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start() {
      if (started) return;
      started = true;
      publish({ status: 'initializing', error: null });
      try {
        await driver.start(
          (user) => {
            ++revision;
            publish({
              user,
              status: user ? 'authenticated' : 'anonymous',
              profile: null,
              profileStatus: 'idle',
              profileError: null,
              error: null,
            });
            if (user) void loadProfile(user);
          },
          (error) => {
            started = false;
            ++revision;
            publish({
              status: 'error',
              user: null,
              profile: null,
              profileStatus: 'idle',
              profileError: null,
              error: getSessionError(error),
            });
          },
        );
      } catch (error) {
        started = false;
        publish({
          status:
            error instanceof SessionError && error.code === 'configuration-missing'
              ? 'unconfigured'
              : 'error',
          error: getSessionError(error),
        });
      }
    },
    signIn: (email: string, password: string) => perform(() => driver.signIn(email, password)),
    signUp: (email: string, password: string) => perform(() => driver.signUp(email, password)),
    google: () => perform(() => driver.google()),
    signOut: () => perform(() => driver.signOut()),
    async retryProfile() {
      if (snapshot.user) await loadProfile(snapshot.user);
    },
    async linkPlayer(tag: string) {
      const user = snapshot.user;
      if (!user)
        throw new SessionError('signed-out', 'Entre na sua conta para vincular um jogador.');
      if (snapshot.profileStatus !== 'ready')
        throw new SessionError('profile-pending', 'Aguarde o carregamento dos dados da conta.');
      if (snapshot.profile)
        throw new SessionError('profile-exists', 'Sua conta já possui um jogador vinculado.');
      const current = revision;
      await perform(async () => {
        const profile = await driver.linkPlayer(user, tag);
        if (current === revision && snapshot.user?.uid === user.uid)
          publish({ profile, profileStatus: 'ready', profileError: null });
      });
    },
  };
}
