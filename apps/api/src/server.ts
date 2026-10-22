import { createServer, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { clashTagSchema } from '@clash-cup/contracts';
import type { ClashService } from './clash-client';
import { ApiError } from './errors';

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

export function createApiServer(service: ClashService) {
  return createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
      }
      const url = new URL(req.url ?? '/', 'http://localhost');
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
      send(res, 200, await route.run(tag));
    } catch (error) {
      const failure =
        error instanceof ApiError
          ? error
          : error instanceof z.ZodError
            ? new ApiError(400, 'INVALID_TAG', 'Informe uma tag válida de Clash Royale.')
            : new ApiError(500, 'INTERNAL_ERROR', 'Não foi possível concluir a consulta.');
      send(res, failure.status, { error: { code: failure.code, message: failure.message } });
    }
  });
}
