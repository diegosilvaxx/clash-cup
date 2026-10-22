import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from './types';

const mocks = vi.hoisted(() => ({
  apps: [] as { name: string }[],
  initialize: vi.fn(),
  auth: {
    currentUser: null as null | { uid: string; getIdToken: () => Promise<string> },
    languageCode: '',
  },
  persistence: vi.fn(),
  observe: vi.fn(),
  unsubscribe: vi.fn(),
  google: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  load: vi.fn(),
  create: vi.fn(),
}));
vi.mock('firebase/app', () => ({ getApps: () => mocks.apps, initializeApp: mocks.initialize }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mocks.auth,
  browserSessionPersistence: 'session',
  setPersistence: mocks.persistence,
  onAuthStateChanged: mocks.observe,
  onIdTokenChanged: mocks.observe,
  signInWithPopup: mocks.google,
  signInWithEmailAndPassword: mocks.signIn,
  createUserWithEmailAndPassword: mocks.signUp,
  signOut: mocks.signOut,
  GoogleAuthProvider: class {},
}));
vi.mock('./profiles', () => ({
  createProfileRepository: () => ({ load: mocks.load, create: mocks.create }),
}));
const env = {
  VITE_FIREBASE_API_KEY: 'test-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-clash-cup',
  VITE_FIREBASE_APP_ID: 'test-app',
};
beforeEach(() => {
  mocks.apps.length = 0;
  mocks.auth.currentUser = null;
  mocks.initialize.mockImplementation((_config, name) => {
    const app = { name };
    mocks.apps.push(app);
    return app;
  });
  mocks.persistence.mockResolvedValue(undefined);
  mocks.observe.mockReturnValue(mocks.unsubscribe);
  mocks.google.mockResolvedValue({});
  mocks.signIn.mockResolvedValue({});
  mocks.signUp.mockResolvedValue({});
  mocks.signOut.mockResolvedValue(undefined);
});
describe('Firebase session driver', () => {
  it('publishes roles from token claims and ignores an outdated observer result', async () => {
    const { createFirebaseDriver } = await import('./firebase-driver');
    const driver = createFirebaseDriver(env);
    const listener = vi.fn();
    await driver.start(listener, vi.fn());
    const emit = mocks.observe.mock.calls[0]![1] as (user: unknown) => void;
    let resolve!: (value: unknown) => void;
    const old = {
      uid: 'old',
      email: null,
      emailVerified: false,
      displayName: null,
      getIdToken: async () => 'token',
      getIdTokenResult: () =>
        new Promise((done) => {
          resolve = done;
        }),
    };
    mocks.auth.currentUser = old;
    emit(old);
    const current = {
      uid: 'current',
      email: null,
      emailVerified: false,
      displayName: null,
      getIdToken: async () => 'token',
      getIdTokenResult: async () => ({ claims: { admin: true, superAdmin: false } }),
    };
    mocks.auth.currentUser = current;
    emit(current);
    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'current', admin: true, superAdmin: false }),
      ),
    );
    resolve({ claims: { admin: true, superAdmin: true } });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('uses one named Firebase app and configures session persistence before observing auth', async () => {
    const { createFirebaseDriver } = await import('./firebase-driver');
    const driver = createFirebaseDriver(env);
    await driver.start(vi.fn(), vi.fn());
    await driver.start(vi.fn(), vi.fn());
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(mocks.persistence).toHaveBeenCalledWith(mocks.auth, 'session');
    expect(mocks.persistence.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.observe.mock.invocationCallOrder[0]!,
    );
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('invokes Google popup immediately from an already initialized driver', async () => {
    const { createFirebaseDriver } = await import('./firebase-driver');
    const driver = createFirebaseDriver(env);
    await driver.start(vi.fn(), vi.fn());
    const popup = driver.google();
    expect(mocks.google).toHaveBeenCalledTimes(1);
    await popup;
  });
  it('does not read another user profile if auth changes while obtaining a token', async () => {
    const { createFirebaseDriver } = await import('./firebase-driver');
    const driver = createFirebaseDriver(env);
    await driver.start(vi.fn(), vi.fn());
    let resolve!: (token: string) => void;
    const token = new Promise<string>((done) => {
      resolve = done;
    });
    mocks.auth.currentUser = { uid: 'user-a', getIdToken: () => token };
    const reading = driver.loadProfile({ uid: 'user-a' } as SessionUser);
    mocks.auth.currentUser = null;
    resolve('test-token');
    await expect(reading).rejects.toThrow('sessão mudou');
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
