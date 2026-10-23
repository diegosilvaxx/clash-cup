import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { clashTagSchema } from '@clash-cup/contracts';
import type { ClashService } from './clash-client';
import { ApiError } from './errors';
import { createAdminHandler } from './admin-routes';
import { createAdminService } from './admin-service';

export async function readJson(req: IncomingMessage) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''))
    throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Envie os dados em JSON.');
  if (Number(req.headers['content-length']) > 16384)
    throw new ApiError(413, 'BODY_TOO_LARGE', 'Os dados excedem o tamanho permitido.');
  // Some function runtimes parse JSON before invoking the Node handler.
  if ('body' in req) {
    let body: unknown;
    let serialized: string | undefined;
    try {
      body = req.body;
      serialized = JSON.stringify(body);
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Envie um JSON válido.');
    }
    if (serialized !== undefined) {
      if (Buffer.byteLength(serialized) > 16384)
        throw new ApiError(413, 'BODY_TOO_LARGE', 'Os dados excedem o tamanho permitido.');
      return body;
    }
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > 16384)
      throw new ApiError(413, 'BODY_TOO_LARGE', 'Os dados excedem o tamanho permitido.');
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Envie um JSON válido.');
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

export function createApiHandler(
  service: ClashService,
  admin = createAdminHandler(createAdminService(service)),
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    let administrative = false;
    const controller = new AbortController();
    req.once('aborted', () => controller.abort());
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      administrative = url.pathname.startsWith('/api/admin/');
      if (administrative) {
        send(
          res,
          200,
          await admin({
            method: req.method ?? '',
            path: url.pathname,
            authorization: req.headers.authorization,
            readBody: () => readJson(req),
            signal: controller.signal,
          }),
        );
        return;
      }
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
      }
      if (url.pathname === '/api/health') {
        send(res, 200, { status: 'ok', service: 'clash-cup-api' });
        return;
      }
      const route = {
        '/api/player': { key: 'idclash', run: service.player },
        '/api/upcomingchests': { key: 'idclash', run: service.upcomingChests },
        '/api/tournaments': { key: 'tag', run: service.tournament },
      }[url.pathname];
      if (!route) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Endereço não encontrado.');
      if (url.searchParams.getAll(route.key).length !== 1)
        throw new ApiError(400, 'INVALID_TAG', 'Informe uma única tag válida.');
      const tag = clashTagSchema.parse(url.searchParams.get(route.key));
      send(res, 200, await route.run(tag, controller.signal));
    } catch (error) {
      if (controller.signal.aborted) return;
      if (
        administrative &&
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'auth/user-not-found'
      ) {
        send(res, 404, {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'A conta informada não foi encontrada no Firebase Authentication.',
          },
        });
        return;
      }
      const failure =
        error instanceof ApiError
          ? error
          : error instanceof z.ZodError
            ? new ApiError(
                400,
                administrative ? 'INVALID_INPUT' : 'INVALID_TAG',
                administrative
                  ? 'Confira os dados informados e tente novamente.'
                  : 'Informe uma tag válida de Clash Royale.',
              )
            : new ApiError(
                500,
                'INTERNAL_ERROR',
                administrative
                  ? 'Não foi possível concluir a operação administrativa. Tente novamente.'
                  : 'Não foi possível concluir a consulta.',
              );
      send(res, failure.status, { error: { code: failure.code, message: failure.message } });
    }
  };
}

export function createApiServer(
  service: ClashService,
  admin?: ReturnType<typeof createAdminHandler>,
) {
  return createServer(createApiHandler(service, admin));
}
