import {
  adminTournamentInputSchema,
  documentIdSchema,
  importPeriodSchema,
  importStartSchema,
  roleChangeSchema,
  walletBindingSchema,
  type AdminPrincipal,
} from '@clash-cup/contracts';
import type { AdminService } from './admin-service';
import { authorizeAdmin } from './admin-runtime';
import { ApiError } from './errors';

export type AdminRequest = {
  method: string;
  path: string;
  authorization: string | undefined;
  readBody: () => Promise<unknown>;
  signal?: AbortSignal;
};
export function createAdminHandler(
  service: AdminService,
  authorize: (authorization: string | undefined) => Promise<AdminPrincipal> = authorizeAdmin,
) {
  return async (request: AdminRequest) => {
    const principal = await authorize(request.authorization);
    const { path, method } = request;
    if (path === '/api/admin/overview' && method === 'GET') return service.overview();
    if (path === '/api/admin/roles' && method === 'GET') return service.listRoles(principal);
    if (path === '/api/admin/roles' && method === 'POST') {
      const input = roleChangeSchema.parse(await request.readBody());
      return service.changeRole(principal, input.email, input.action);
    }
    if (path === '/api/admin/tournaments' && (method === 'POST' || method === 'PUT'))
      return service.saveTournament(
        principal,
        adminTournamentInputSchema.parse(await request.readBody()),
        method === 'POST',
      );
    if (path === '/api/admin/wallets/associate' && method === 'POST')
      return service.bindWallet(principal, walletBindingSchema.parse(await request.readBody()));
    if (path === '/api/admin/imports/preview' && method === 'POST')
      return service.preview(importPeriodSchema.parse(await request.readBody()), request.signal);
    if (path === '/api/admin/imports' && method === 'POST')
      return service.startImport(
        principal,
        importStartSchema.parse(await request.readBody()),
        request.signal,
      );
    const process = path.match(/^\/api\/admin\/imports\/([A-Z0-9]{3,20})\/process$/);
    if (process && method === 'POST')
      return service.processImport(principal, documentIdSchema.parse(process[1]), request.signal);
    if (
      [
        '/api/admin/overview',
        '/api/admin/roles',
        '/api/admin/tournaments',
        '/api/admin/wallets/associate',
        '/api/admin/imports/preview',
        '/api/admin/imports',
      ].includes(path) ||
      process
    )
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
    throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Endereço não encontrado.');
  };
}
