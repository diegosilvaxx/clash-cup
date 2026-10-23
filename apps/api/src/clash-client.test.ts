import { AxiosError, AxiosHeaders, CanceledError, type AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClashService } from './clash-client';

function mockClient() {
  const get = vi.fn();
  return { get, http: { get } as unknown as AxiosInstance };
}
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

describe('Clash Royale adapter', () => {
  it('forwards cancellation to the upstream client without rewriting it as a server error', async () => {
    const { get, http } = mockClient();
    const signal = new AbortController().signal;
    const cancelled = new CanceledError('cancelled');
    get.mockRejectedValue(cancelled);
    await expect(createClashService('test-token', http).player('P0Y', signal)).rejects.toBe(
      cancelled,
    );
    expect(get).toHaveBeenCalledWith('/players/%23P0Y', { signal });
  });
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
  it.each([
    [401, { reason: 'accessDenied' }, 'UPSTREAM_AUTH_FAILED'],
    [403, { reason: 'accessDenied.invalidIp' }, 'UPSTREAM_IP_NOT_ALLOWED'],
    [403, { reason: 'accessDenied' }, 'UPSTREAM_ACCESS_DENIED'],
    [403, '<html>Forbidden</html>', 'UPSTREAM_ACCESS_DENIED'],
    [500, { reason: 'accessDenied.invalidIp' }, 'UPSTREAM_UNAVAILABLE'],
  ])('distinguishes upstream denial %s without guessing the cause', async (status, data, code) => {
    const { get, http } = mockClient();
    get.mockRejectedValue(
      new AxiosError('private upstream message', undefined, undefined, undefined, {
        status,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders({ Authorization: 'Bearer private-token' }) },
        data,
      }),
    );
    await expect(createClashService('private-token', http).player('P0Y')).rejects.toMatchObject({
      status: 502,
      code,
    });
    expect(console.error).toHaveBeenCalledWith('Clash Royale request failed', {
      code,
      upstreamStatus: status,
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private');
  });
  it.each(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ERR_NETWORK'])(
    'identifies connection failure %s without exposing request details',
    async (code) => {
      const { get, http } = mockClient();
      get.mockRejectedValue(new AxiosError('private connection details', code));
      await expect(createClashService('test-token', http).player('P0Y')).rejects.toMatchObject({
        status: 502,
        code: 'UPSTREAM_CONNECTION_FAILED',
      });
      expect(console.error).toHaveBeenCalledWith('Clash Royale request failed', {
        code: 'UPSTREAM_CONNECTION_FAILED',
        upstreamStatus: null,
      });
    },
  );
  it('does not report browser cancellation as an upstream failure', async () => {
    const { get, http } = mockClient();
    get.mockRejectedValue(new CanceledError('cancelled'));
    await expect(createClashService('test-token', http).player('P0Y')).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});
