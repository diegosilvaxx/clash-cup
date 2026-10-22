import axios from 'axios';
import { z } from 'zod';
import { getAuth, getFirebaseApp } from '@clash-cup/firebase';
import { createHttpClient } from '@clash-cup/http';
import {
  adminOverviewSchema,
  adminRoleSchema,
  apiErrorSchema,
  importJobSchema,
  importPreviewSchema,
  type AdminTournamentInput,
  type ImportPeriod,
  type ImportPreview,
  type WalletBinding,
} from '@clash-cup/contracts';

class AdminClientError extends Error {}
const http = createHttpClient('/api/admin');
async function request<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  schema: z.ZodType<T>,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const auth = getAuth(getFirebaseApp());
  const user = auth.currentUser;
  if (!user) throw new AdminClientError('Entre novamente para acessar a administração.');
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid)
    throw new AdminClientError('Sua sessão mudou. Entre novamente.');
  const response = await http.request<unknown>({
    method,
    url: path,
    data,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 60_000,
    ...(signal ? { signal } : {}),
  });
  if (auth.currentUser?.uid !== user.uid)
    throw new AdminClientError('Sua sessão mudou. Entre novamente.');
  return schema.parse(response.data);
}
export function adminError(error: unknown) {
  if (error instanceof AdminClientError) return error.message;
  if (axios.isAxiosError(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) return parsed.data.error.message;
  }
  return 'Não foi possível concluir a operação administrativa. Tente novamente.';
}
export const adminClient = {
  overview: (signal: AbortSignal) =>
    request('GET', '/overview', adminOverviewSchema, undefined, signal),
  saveTournament: (data: AdminTournamentInput, create: boolean) =>
    request(create ? 'POST' : 'PUT', '/tournaments', z.object({ saved: z.literal(true) }), data),
  bindWallet: (data: WalletBinding) =>
    request('POST', '/wallets/associate', z.object({ associated: z.literal(true) }), data),
  preview: (data: ImportPeriod, signal: AbortSignal) =>
    request('POST', '/imports/preview', importPreviewSchema, data, signal),
  start: (data: ImportPreview, signal: AbortSignal) =>
    request(
      'POST',
      '/imports',
      importJobSchema,
      {
        tag: data.tag,
        year: data.year,
        month: data.month,
        fingerprint: data.fingerprint,
        confirmedNew: true,
      },
      signal,
    ),
  process: (id: string, signal: AbortSignal) =>
    request('POST', `/imports/${encodeURIComponent(id)}/process`, importJobSchema, {}, signal),
  roles: (signal: AbortSignal) =>
    request('GET', '/roles', z.array(adminRoleSchema), undefined, signal),
  changeRole: (email: string, action: 'grant' | 'revoke') =>
    request('POST', '/roles', z.object({ changed: z.boolean() }), { email, action }),
  async refreshPermissions() {
    const user = getAuth(getFirebaseApp()).currentUser;
    if (user) await user.getIdToken(true);
  },
};
