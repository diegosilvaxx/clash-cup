import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeAdmin } from './admin-runtime';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), user: vi.fn() }));
vi.mock('firebase-admin/app', () => ({
  applicationDefault: () => ({}),
  getApps: () => [{ name: 'clash-cup-admin' }],
  initializeApp: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mocks.verify, getUser: mocks.user }),
}));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({}) }));
beforeEach(() => {
  vi.stubEnv('FIREBASE_PROJECT_ID', 'demo-clash-cup');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-clash-cup');
  mocks.verify.mockReset().mockResolvedValue({ uid: 'a', admin: true, superAdmin: true });
  mocks.user.mockReset().mockResolvedValue({
    uid: 'a',
    disabled: false,
    customClaims: { admin: true, superAdmin: true },
  });
});
afterEach(() => vi.unstubAllEnvs());
describe('server administrative authorization', () => {
  it('validates the signed token, revocation and current server claims', async () => {
    expect(await authorizeAdmin('Bearer signed-token')).toEqual({ uid: 'a', superAdmin: true });
    expect(mocks.verify).toHaveBeenCalledWith('signed-token', true);
    expect(mocks.user).toHaveBeenCalledWith('a');
  });
  it.each([undefined, 'signed-token', 'Bearer token with spaces'])(
    'rejects missing or malformed authorization: %s',
    async (value) => {
      await expect(authorizeAdmin(value)).rejects.toMatchObject({ status: 401 });
      expect(mocks.verify).not.toHaveBeenCalled();
    },
  );
  it('does not trust a previously issued admin claim after access is removed', async () => {
    mocks.user.mockResolvedValue({ uid: 'a', customClaims: { admin: false } });
    await expect(authorizeAdmin('Bearer signed-token')).rejects.toMatchObject({ status: 403 });
  });
  it('does not elevate a token that lacks the admin claim or a disabled account', async () => {
    mocks.verify.mockResolvedValue({ uid: 'a' });
    await expect(authorizeAdmin('Bearer token')).rejects.toMatchObject({ status: 403 });
    mocks.user.mockResolvedValue({ uid: 'a', disabled: true, customClaims: { admin: true } });
    await expect(authorizeAdmin('Bearer token')).rejects.toMatchObject({ status: 401 });
  });
  it('sanitizes invalid tokens and unavailable credentials', async () => {
    mocks.verify.mockRejectedValue({ code: 'auth/id-token-revoked', message: 'private token' });
    await expect(authorizeAdmin('Bearer token')).rejects.toMatchObject({ status: 401 });
    mocks.verify.mockRejectedValue(new Error('private credential path'));
    await expect(authorizeAdmin('Bearer token')).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('FIREBASE_PROJECT_ID', '');
    await expect(authorizeAdmin('Bearer token')).rejects.toMatchObject({
      code: 'ADMIN_NOT_CONFIGURED',
    });
  });
});
