import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiHandler } from './server';
import { createClashService } from './clash-client';
import type { AdminRequest } from './admin-routes';

function invocation(url: string, method = 'GET', body?: string) {
  const request = Object.assign(new PassThrough(), {
    url,
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  });
  const events = new EventEmitter();
  const response = Object.assign(events, {
    destroyed: false,
    writableEnded: false,
    status: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    writeHead(status: number, headers: Record<string, string>) {
      this.status = status;
      Object.assign(this.headers, headers);
    },
    end(value: string) {
      this.body = value;
      this.writableEnded = true;
      events.emit('close');
    },
  });
  request.end(body);
  return {
    request: request as unknown as IncomingMessage,
    response,
    nodeResponse: response as unknown as ServerResponse,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe('Vercel HTTP entrypoint', () => {
  it('keeps health available with an invalid provider and refuses external queries', async () => {
    const handler = createApiHandler(createClashService('test-token', undefined, 'invalid'));
    const health = invocation('/api/health');
    await handler(health.request, health.nodeResponse);
    expect(health.response.status).toBe(200);
    const profile = invocation('/api/player?idclash=P0Y');
    await handler(profile.request, profile.nodeResponse);
    expect(profile.response.status).toBe(503);
    expect(JSON.parse(profile.response.body).error.code).toBe('API_PROVIDER_NOT_CONFIGURED');
  });
  it('exports a callable handler and answers health without token, credentials or a listener', async () => {
    vi.stubEnv('CLASH_ROYALE_API_TOKEN', '');
    vi.stubEnv('FIREBASE_PROJECT_ID', '');
    const { default: handler } = await import('./vercel');
    expect(typeof handler).toBe('function');
    const { request, response, nodeResponse } = invocation('/api/health');
    await handler(request, nodeResponse);
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok', service: 'clash-cup-api' });
    expect(response.headers['Cache-Control']).toBe('no-store');
  });

  it('keeps API validation when the platform invokes the handler directly', async () => {
    const handler = createApiHandler(createClashService(undefined));
    const { request, response, nodeResponse } = invocation('/api/upcomingchests?idclash=!');
    await handler(request, nodeResponse);
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body).error.code).toBe('INVALID_TAG');
  });

  it('keeps raw administrative JSON readable through the same request handler', async () => {
    const received = vi.fn();
    const admin = vi.fn(async ({ readBody }: AdminRequest) => {
      received(await readBody());
      return { changed: true };
    });
    const handler = createApiHandler(createClashService(undefined), admin);
    const { request, response, nodeResponse } = invocation(
      '/api/admin/tournaments',
      'POST',
      '{"name":"Copa"}',
    );
    await handler(request, nodeResponse);
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ changed: true });
    expect(received).toHaveBeenCalledWith({ name: 'Copa' });
    expect(admin).toHaveBeenCalledOnce();
  });

  it('accepts administrative JSON already parsed by the platform', async () => {
    const received = vi.fn();
    const admin = vi.fn(async ({ readBody }: AdminRequest) => {
      received(await readBody());
      return { changed: true };
    });
    const handler = createApiHandler(createClashService(undefined), admin);
    const { request, response, nodeResponse } = invocation('/api/admin/tournaments', 'POST', '');
    Object.assign(request, { body: { name: 'Copa' } });
    await handler(request, nodeResponse);
    expect(response.status).toBe(200);
    expect(received).toHaveBeenCalledWith({ name: 'Copa' });
  });

  it('keeps the size limit and controlled errors for platform-parsed bodies', async () => {
    const admin = vi.fn(async ({ readBody }: AdminRequest) => {
      await readBody();
      return { changed: true };
    });
    const handler = createApiHandler(createClashService(undefined), admin);
    const oversized = invocation('/api/admin/tournaments', 'POST', '');
    Object.assign(oversized.request, { body: { name: 'a'.repeat(16385) } });
    await handler(oversized.request, oversized.nodeResponse);
    expect(oversized.response.status).toBe(413);
    const invalid = invocation('/api/admin/tournaments', 'POST', '');
    Object.defineProperty(invalid.request, 'body', {
      get() {
        throw new Error('private parser details');
      },
    });
    await handler(invalid.request, invalid.nodeResponse);
    expect(invalid.response.status).toBe(400);
    expect(JSON.parse(invalid.response.body).error.code).toBe('INVALID_JSON');
    expect(invalid.response.body).not.toContain('private');
  });
});
