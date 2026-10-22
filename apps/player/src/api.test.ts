import { AxiosError, CanceledError, type AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createPlayerClient, playerError, safeExternalUrl } from './api';
describe('player client', () => {
  it('uses the same origin BFF with a normalized tag and abort signal', async () => {
    const get = vi.fn().mockResolvedValue({ data: { tag: '#P0Y', name: 'Player', trophies: 0 } });
    const client = createPlayerClient({ get } as unknown as AxiosInstance);
    const signal = new AbortController().signal;
    expect(await client.profile(' #p0y ', signal)).toMatchObject({ trophies: 0 });
    expect(get).toHaveBeenCalledWith('/player', { params: { idclash: 'P0Y' }, signal });
  });
  it('rejects a response from another player', async () => {
    const get = vi.fn().mockResolvedValue({ data: { tag: '#ABC', name: 'Other' } });
    await expect(
      createPlayerClient({ get } as unknown as AxiosInstance).profile(
        '#P0Y',
        new AbortController().signal,
      ),
    ).rejects.toThrow('outro jogador');
  });
  it('validates and sorts chests without altering the source response', async () => {
    const items = [
      { index: 10, name: 'Giant Chest' },
      { index: 0, name: 'Silver Chest' },
    ];
    const get = vi.fn().mockResolvedValue({ data: { items } });
    const client = createPlayerClient({ get } as unknown as AxiosInstance);
    expect(
      (await client.chests('P0Y', new AbortController().signal)).items.map((item) => item.index),
    ).toEqual([0, 10]);
    expect(items[0]?.index).toBe(10);
    get.mockResolvedValue({ data: { items: [{ index: -1, name: 'Chest' }] } });
    await expect(client.chests('P0Y', new AbortController().signal)).rejects.toThrow();
  });
  it('does not turn a cancelled request into a successful result', async () => {
    const cancellation = new CanceledError('cancelled');
    const get = vi.fn().mockRejectedValue(cancellation);
    await expect(
      createPlayerClient({ get } as unknown as AxiosInstance).profile(
        'P0Y',
        new AbortController().signal,
      ),
    ).rejects.toBe(cancellation);
  });
  it('never renders private diagnostics in error messages', () => {
    const error = new AxiosError('private config');
    expect(playerError(error)).not.toContain('private');
    expect(playerError(new Error('private response'))).not.toContain('private');
  });
  it('accepts only HTTPS external links without credentials', () => {
    for (const value of [
      undefined,
      '',
      'javascript:alert(1)',
      'http://example.com',
      'https://user:pass@example.com',
    ])
      expect(safeExternalUrl(value)).toBeNull();
    expect(safeExternalUrl('https://www.patreon.com/clashcupbrasil')).toBe(
      'https://www.patreon.com/clashcupbrasil',
    );
  });
});
