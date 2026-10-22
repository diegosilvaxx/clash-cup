import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './config';
import { getSessionError } from './errors';

describe('session configuration and errors', () => {
  it('validates the public config without exposing its values in errors', () => {
    expect(() => readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'not-public-in-an-error' })).toThrow(
      'não está configurado',
    );
    expect(
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'test-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'demo-clash-cup',
        VITE_FIREBASE_APP_ID: 'test-app',
      }),
    ).toMatchObject({ projectId: 'demo-clash-cup' });
  });
  it('normalizes SDK errors and never renders raw SDK messages', () => {
    expect(
      getSessionError({ code: 'auth/popup-closed-by-user', message: 'raw details' }),
    ).toContain('cancelado');
    expect(getSessionError({ code: 'auth/unauthorized-domain', message: 'raw details' })).toContain(
      'autorizado',
    );
    expect(getSessionError(new Error('private SDK payload'))).not.toContain('private');
  });
});
