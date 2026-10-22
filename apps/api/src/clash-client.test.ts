import { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createClashService } from './clash-client';

function mockClient() {
  const get = vi.fn();
  return { get, http: { get } as unknown as AxiosInstance };
}
describe('Clash Royale adapter', () => {
  it('encodes the tag and validates successful upstream data', async () => {
    const { get, http } = mockClient();
    get.mockResolvedValue({ data: { tag: '#P0Y', name: 'Player', trophies: 9000 } });
    expect(await createClashService('test-token', http).player('P0Y')).toMatchObject({
      trophies: 9000,
    });
    expect(get).toHaveBeenCalledWith('/players/%23P0Y');
  });
  it('rejects an invalid successful response', async () => {
    const { get, http } = mockClient();
    get.mockResolvedValue({ data: { unexpected: true } });
    await expect(createClashService('test-token', http).player('P0Y')).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_UPSTREAM_RESPONSE',
    });
  });
  it.each([
    [404, 404],
    [429, 429],
    [401, 502],
    [403, 502],
    [500, 502],
  ])('maps upstream status %s to %s without exposing its error', async (upstream, expected) => {
    const { get, http } = mockClient();
    get.mockRejectedValue(
      new AxiosError('private details', undefined, undefined, undefined, {
        status: upstream,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { secret: 'not public' },
      }),
    );
    await expect(createClashService('test-token', http).player('P0Y')).rejects.toMatchObject({
      status: expected,
    });
  });
  it('maps timeouts separately from other network failures', async () => {
    const { get, http } = mockClient();
    get.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
    await expect(createClashService('test-token', http).player('P0Y')).rejects.toMatchObject({
      status: 504,
    });
  });
});
