import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminClient } from './client';
const mocks = vi.hoisted(() => ({ uid: 'a', token: vi.fn(), request: vi.fn() }));
vi.mock('@clash-cup/http', () => ({ createHttpClient: () => ({ request: mocks.request }) }));
vi.mock('@clash-cup/firebase', () => ({
  getFirebaseApp: () => ({}),
  getAuth: () => ({
    get currentUser() {
      return mocks.uid ? { uid: mocks.uid, getIdToken: mocks.token } : null;
    },
  }),
}));
beforeEach(() => {
  mocks.uid = 'a';
  mocks.token.mockReset().mockResolvedValue('signed-token');
  mocks.request.mockReset();
});
describe('administrative HTTP client', () => {
  it('uses a bearer header and never sends preview members as authoritative scores', async () => {
    const job = {
      id: 'CUP',
      tag: '#CUP',
      name: 'Cup',
      year: 2026,
      month: 10,
      total: 1,
      processed: 0,
      status: 'processing' as const,
    };
    mocks.request.mockResolvedValue({ data: job });
    await adminClient.start(
      {
        ...job,
        members: [{ tag: '#P0Y', name: 'Player', score: 3, clan: null }],
        fingerprint: 'a'.repeat(64),
        existing: null,
      },
      new AbortController().signal,
    );
    const request = mocks.request.mock.calls[0]![0];
    expect(request.headers).toEqual({ Authorization: 'Bearer signed-token' });
    expect(request.data).toEqual({
      tag: '#CUP',
      year: 2026,
      month: 10,
      fingerprint: 'a'.repeat(64),
      confirmedNew: true,
    });
  });
  it('rejects account changes during token retrieval before sending a request', async () => {
    mocks.token.mockImplementation(async () => {
      mocks.uid = 'b';
      return 'token';
    });
    await expect(adminClient.overview(new AbortController().signal)).rejects.toThrow(
      'sessão mudou',
    );
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
