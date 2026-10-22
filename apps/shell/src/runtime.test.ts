import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ registerRemotes: vi.fn(), loadRemote: vi.fn(), get: vi.fn() }));
vi.mock('@module-federation/runtime', () => ({
  getInstance: () => ({ registerRemotes: mocks.registerRemotes, loadRemote: mocks.loadRemote }),
}));
vi.mock('@clash-cup/http', () => ({ createHttpClient: () => ({ get: mocks.get }) }));
beforeEach(() => {
  vi.resetModules();
  mocks.get.mockResolvedValue({
    data: {
      remotes: {
        portal: 'http://127.0.0.1:5301/remoteEntry.js',
        auth: 'http://127.0.0.1:5302/remoteEntry.js',
        competition: 'http://127.0.0.1:5303/remoteEntry.js',
        player: 'http://127.0.0.1:5304/remoteEntry.js',
        admin: 'http://127.0.0.1:5305/remoteEntry.js',
      },
    },
  });
  mocks.loadRemote.mockResolvedValue({ App: () => null });
});

describe('remote recovery', () => {
  it('keeps portal and authentication registrations independent', async () => {
    const { loadRemoteApp } = await import('./runtime');
    await loadRemoteApp('portal');
    await loadRemoteApp('auth', 1);
    await loadRemoteApp('portal');
    expect(mocks.registerRemotes).toHaveBeenCalledTimes(2);
    expect(mocks.registerRemotes.mock.calls[0]?.[0][0].name).toBe('portal');
    expect(mocks.registerRemotes.mock.calls[1]?.[0][0].name).toBe('auth');
  });
  it('preserves the recovered entry after navigating away and mounting again', async () => {
    const { loadPortal } = await import('./runtime');
    mocks.loadRemote.mockRejectedValueOnce(new Error('offline'));
    await expect(loadPortal()).rejects.toThrow('offline');
    await loadPortal(1);
    const recovered = mocks.registerRemotes.mock.calls[1]?.[0][0].entry as string;
    expect(recovered).toContain('?retry=');
    await loadPortal();
    expect(mocks.registerRemotes).toHaveBeenCalledTimes(2);
    expect(mocks.registerRemotes.mock.calls[1]?.[0][0].entry).toBe(recovered);
  });
  it('registers a changed runtime configuration', async () => {
    const { loadPortal } = await import('./runtime');
    await loadPortal();
    mocks.get.mockResolvedValue({
      data: {
        remotes: {
          portal: 'https://example.com/remoteEntry.js',
          auth: 'http://127.0.0.1:5302/remoteEntry.js',
          competition: 'http://127.0.0.1:5303/remoteEntry.js',
          player: 'http://127.0.0.1:5304/remoteEntry.js',
          admin: 'http://127.0.0.1:5305/remoteEntry.js',
        },
      },
    });
    await loadPortal();
    expect(mocks.registerRemotes.mock.calls[1]?.[0][0].entry).toBe(
      'https://example.com/remoteEntry.js',
    );
  });
  it('rejects malformed configuration before registering a remote', async () => {
    mocks.get.mockResolvedValue({ data: { remotes: { portal: 'javascript:alert(1)' } } });
    const { loadPortal } = await import('./runtime');
    await expect(loadPortal()).rejects.toThrow();
    expect(mocks.registerRemotes).not.toHaveBeenCalled();
  });
});
