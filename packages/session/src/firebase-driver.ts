import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
  getFirebaseApp,
} from '@clash-cup/firebase';
import { readFirebaseConfig } from './config';
import { SessionError } from './errors';
import { createProfileRepository } from './profiles';
import type { SessionDriver, SessionUser } from './types';

export function createFirebaseDriver(env: Record<string, unknown>): SessionDriver {
  let auth: Auth | undefined;
  let observation = 0;
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
      const app = getFirebaseApp(env);
      auth = getAuth(app);
      auth.languageCode = 'pt-BR';
      profiles = createProfileRepository(config.projectId);
      await setPersistence(auth, browserSessionPersistence);
      ++observation;
      unsubscribe?.();
      unsubscribe = onIdTokenChanged(
        auth,
        (user) => {
          const current = ++observation;
          if (!user) {
            onUser(null);
            return;
          }
          void user.getIdTokenResult().then(
            (result) => {
              if (current !== observation || auth?.currentUser?.uid !== user.uid) return;
              onUser({
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: user.displayName,
                admin: result.claims.admin === true,
                superAdmin: result.claims.superAdmin === true,
              });
            },
            (error) => {
              if (current === observation) onError(error);
            },
          );
        },
        (error) => {
          ++observation;
          onError(error);
        },
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
