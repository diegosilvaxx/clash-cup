import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiServer } from './server';
import { createClashService, type ClashService } from './clash-client';
import { ApiError } from './errors';

let server: Server | undefined;
async function start(service: ClashService) {
  server = createApiServer(service);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return axios.create({
    baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    validateStatus: () => true,
  });
}
function mockService() {
  return {
    player: vi.fn().mockResolvedValue({ tag: '#P0Y', name: 'Player' }),
    upcomingChests: vi.fn().mockResolvedValue({ items: [] }),
    tournament: vi.fn().mockResolvedValue({ tag: '#P0Y', name: 'Cup', membersList: [] }),
  };
}
afterEach(async () => {
  if (server) {
    const closing = new Promise<void>((resolve) => server!.close(() => resolve()));
    server.closeAllConnections();
    await closing;
    server = undefined;
  }
});

describe('API routes', () => {
  it('starts without credentials and exposes health without querying upstream', async () => {
    const http = await start(createClashService(undefined));
    expect((await http.get('/api/health')).data).toEqual({
      status: 'ok',
      service: 'clash-cup-api',
    });
    expect((await http.get('/api/player?idclash=P0Y')).status).toBe(503);
  });
  it.each([
    '/api/player',
    '/api/player?idclash=',
    '/api/player?idclash=P0Y&idclash=Q0Y',
    '/api/tournaments?tag=bad%2Ftag',
  ])('rejects malformed input before upstream: %s', async (path) => {
    const service = mockService();
    const response = await (await start(service)).get(path);
    expect(response.status).toBe(400);
    expect(service.player).not.toHaveBeenCalled();
    expect(service.tournament).not.toHaveBeenCalled();
  });
  it.each([
    ['/api/player?idclash=%23p0y', 'player'],
    ['/api/upcomingchests?idclash=%23p0y', 'upcomingChests'],
    ['/api/tournaments?tag=%23p0y', 'tournament'],
  ] as const)('preserves the legacy route and normalizes the tag: %s', async (path, method) => {
    const service = mockService();
    expect((await (await start(service)).get(path)).status).toBe(200);
    expect(service[method]).toHaveBeenCalledWith('P0Y');
  });
  it('uses an explicit method policy and returns 404 for unknown routes', async () => {
    const http = await start(mockService());
    const response = await http.post('/api/player?idclash=P0Y');
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
    expect((await http.get('/api/unknown')).status).toBe(404);
  });
  it('preserves controlled errors and never returns raw exceptions', async () => {
    const service = mockService();
    service.player
      .mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', 'Tente novamente mais tarde.'))
      .mockRejectedValueOnce(new Error('private upstream configuration'));
    const http = await start(service);
    expect((await http.get('/api/player?idclash=P0Y')).status).toBe(429);
    const response = await http.get('/api/player?idclash=P0Y');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.data)).not.toContain('private');
  });
});
