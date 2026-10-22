import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createAdminHandler } from './admin-routes';
import type { AdminService } from './admin-service';
import { readJson } from './server';
import { ApiError } from './errors';

function fixture() {
  const service = Object.fromEntries(
    [
      'overview',
      'saveTournament',
      'bindWallet',
      'preview',
      'startImport',
      'processImport',
      'listRoles',
      'changeRole',
    ].map((name) => [name, vi.fn().mockResolvedValue({})]),
  );
  const authorize = vi.fn().mockResolvedValue({ uid: 'a', superAdmin: false });
  return {
    service,
    authorize,
    dispatch: createAdminHandler(service as unknown as AdminService, authorize),
  };
}
const request = (path: string, method = 'GET', body: unknown = {}) => ({
  path: '/api/admin' + path,
  method,
  authorization: 'Bearer token',
  readBody: vi.fn().mockResolvedValue(body),
});
describe('administrative request boundary', () => {
  it('authorizes before reading the body or calling a privileged service', async () => {
    const { dispatch, authorize, service } = fixture();
    authorize.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Denied'));
    const input = request('/imports', 'POST', { members: [{ score: 999999 }] });
    await expect(dispatch(input)).rejects.toMatchObject({ status: 403 });
    expect(input.readBody).not.toHaveBeenCalled();
    for (const method of Object.values(service)) expect(method).not.toHaveBeenCalled();
  });
  it('requires explicit confirmation and never accepts client supplied scores', async () => {
    const { dispatch, service } = fixture();
    const body = {
      tag: '#ABC',
      year: 2026,
      month: 10,
      fingerprint: 'a'.repeat(64),
      confirmedNew: true,
      members: [{ score: 999999 }],
    };
    await dispatch(request('/imports', 'POST', body));
    expect(service.startImport).toHaveBeenCalledWith(
      { uid: 'a', superAdmin: false },
      { tag: '#ABC', year: 2026, month: 10, fingerprint: 'a'.repeat(64), confirmedNew: true },
      undefined,
    );
    await expect(
      dispatch(request('/imports', 'POST', { ...body, confirmedNew: false })),
    ).rejects.toThrow();
  });
  it('validates role mutations and rejects unsupported routes/methods', async () => {
    const { dispatch, service } = fixture();
    await expect(
      dispatch(request('/roles', 'POST', { email: 'invalid', action: 'grant' })),
    ).rejects.toThrow();
    expect(service.changeRole).not.toHaveBeenCalled();
    await expect(dispatch(request('/overview', 'DELETE'))).rejects.toMatchObject({ status: 405 });
    await expect(dispatch(request('/unknown'))).rejects.toMatchObject({ status: 404 });
  });
  it('limits and validates JSON without echoing request data', async () => {
    const message = (body: string, contentType = 'application/json') =>
      Object.assign(Readable.from([Buffer.from(body)]), {
        headers: { 'content-type': contentType },
      }) as unknown as IncomingMessage;
    expect(await readJson(message('{"ok":true}'))).toEqual({ ok: true });
    await expect(readJson(message('private data', 'text/plain'))).rejects.toMatchObject({
      status: 415,
    });
    await expect(readJson(message('not-json'))).rejects.toMatchObject({ status: 400 });
    await expect(readJson(message('x'.repeat(16385)))).rejects.toMatchObject({ status: 413 });
  });
});
