import { describe, expect, it, vi } from 'vitest';
import { createReadCache } from './read-cache';
describe('read cache', () => {
  it('coalesces 100 simultaneous readers and reuses a successful result until expiration', async () => {
    let clock = 0;
    const cache = createReadCache(120000, () => clock);
    const read = vi.fn(async () => ['one']);
    await Promise.all(Array.from({ length: 100 }, () => cache.read('ranking', read)));
    await cache.read('ranking', read);
    expect(read).toHaveBeenCalledTimes(1);
    clock = 120001;
    expect(read).toHaveBeenCalledTimes(1);
    await cache.read('ranking', read);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('refreshes explicitly without duplicating in-flight requests', async () => {
    const cache = createReadCache();
    const read = vi.fn(async () => 'data');
    await cache.read('key', read);
    await Promise.all([
      cache.read('key', read, { force: true }),
      cache.read('key', read, { force: true }),
    ]);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('briefly retains errors to avoid repeated mounts hammering an exhausted quota and allows manual retry', async () => {
    const cache = createReadCache();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('resource-exhausted'))
      .mockResolvedValue('ok');
    await expect(cache.read('key', load)).rejects.toThrow('resource-exhausted');
    await expect(cache.read('key', load)).rejects.toThrow('resource-exhausted');
    expect(load).toHaveBeenCalledTimes(1);
    await expect(cache.read('key', load, { force: true })).resolves.toBe('ok');
  });
  it('does not revive stale data after invalidating a pending read', async () => {
    const cache = createReadCache();
    let resolve!: (value: string) => void;
    const old = cache.read(
      'key',
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    await Promise.resolve();
    cache.invalidate('key');
    await cache.read('key', async () => 'new');
    resolve('old');
    await old;
    expect(await cache.read('key', async () => 'wrong')).toBe('new');
  });
});
