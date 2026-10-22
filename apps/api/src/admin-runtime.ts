import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { AdminPrincipal } from '@clash-cup/contracts';
import { ApiError } from './errors';

export function adminRuntime() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (
    projectId &&
    process.env.VITE_FIREBASE_PROJECT_ID &&
    process.env.VITE_FIREBASE_PROJECT_ID !== projectId
  )
    throw new ApiError(
      503,
      'FIREBASE_PROJECT_MISMATCH',
      'O projeto Firebase do servidor precisa corresponder ao projeto do portal.',
    );
  if (!projectId)
    throw new ApiError(
      503,
      'ADMIN_NOT_CONFIGURED',
      'A administração ainda não foi configurada no servidor.',
    );
  const app =
    getApps().find((item) => item.name === 'clash-cup-admin') ??
    initializeApp({ projectId, credential: applicationDefault() }, 'clash-cup-admin');
  return { auth: getAuth(app), database: getFirestore(app) };
}
export async function authorizeAdmin(authorization: string | undefined): Promise<AdminPrincipal> {
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match || match[1]!.length > 8192)
    throw new ApiError(401, 'UNAUTHENTICATED', 'Entre novamente para acessar a administração.');
  try {
    const { auth } = adminRuntime();
    const token = await auth.verifyIdToken(match[1]!, true);
    const user = await auth.getUser(token.uid);
    if (user.disabled)
      throw new ApiError(401, 'UNAUTHENTICATED', 'Esta conta não está disponível.');
    // Check current claims too, so removing a role takes effect before token expiry.
    if (token.admin !== true || user.customClaims?.admin !== true)
      throw new ApiError(403, 'FORBIDDEN', 'Sua conta não tem acesso à administração.');
    return {
      uid: token.uid,
      superAdmin: token.superAdmin === true && user.customClaims?.superAdmin === true,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (
      [
        'auth/id-token-expired',
        'auth/id-token-revoked',
        'auth/argument-error',
        'auth/invalid-id-token',
        'auth/user-disabled',
        'auth/user-not-found',
      ].includes(String(code))
    )
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.');
    throw new ApiError(
      503,
      'ADMIN_UNAVAILABLE',
      'Não foi possível validar o acesso administrativo. Confira a configuração do servidor.',
    );
  }
}
