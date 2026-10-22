import { getApps, initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
} from 'firebase/auth';
import { readFirebaseConfig } from './config';
import { SessionError } from './errors';
import { createProfileRepository } from './profiles';
import type { SessionDriver, SessionUser } from './types';

export function createFirebaseDriver(env: Record<string, unknown>): SessionDriver {
  let auth: Auth | undefined;
  let unsubscribe: Unsubscribe | undefined;
  let profiles: ReturnType<typeof createProfileRepository> | undefined;
  function requireAuth() {
    if (!auth) throw new SessionError('not-ready', 'Aguarde a inicialização do login.');
    return auth;
  }
  async function credentials(user: SessionUser) {
    const current = requireAuth().currentUser;
    if (!current || current.uid !== user.uid)
      throw new SessionError('signed-out', 'Sua sessão mudou. Entre novamente para continuar.');
    const token = await current.getIdToken();
    if (requireAuth().currentUser?.uid !== user.uid)
      throw new SessionError('signed-out', 'Sua sessão mudou. Entre novamente para continuar.');
    return { user, token };
  }
  return {
    async start(onUser, onError) {
      const config = readFirebaseConfig(env);
      const app =
        getApps().find((app) => app.name === 'clash-cup') ?? initializeApp(config, 'clash-cup');
      auth = getAuth(app);
      auth.languageCode = 'pt-BR';
      profiles = createProfileRepository(config.projectId);
      await setPersistence(auth, browserSessionPersistence);
      unsubscribe?.();
      unsubscribe = onAuthStateChanged(
        auth,
        (user) =>
          onUser(
            user
              ? {
                  uid: user.uid,
                  email: user.email,
                  emailVerified: user.emailVerified,
                  displayName: user.displayName,
                }
              : null,
          ),
        onError,
      );
    },
    signIn: (email, password) =>
      signInWithEmailAndPassword(requireAuth(), email, password).then(() => undefined),
    signUp: (email, password) =>
      createUserWithEmailAndPassword(requireAuth(), email, password).then(() => undefined),
    google: () => signInWithPopup(requireAuth(), new GoogleAuthProvider()).then(() => undefined),
    signOut: () => signOut(requireAuth()),
    async loadProfile(user) {
      if (!profiles) throw new Error('Profiles unavailable');
      return profiles.load(await credentials(user));
    },
    async linkPlayer(user, tag) {
      if (!profiles) throw new Error('Profiles unavailable');
      return profiles.create(await credentials(user), tag);
    },
  };
}
