import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// This command runs only in a trusted local/server environment, never in a browser.
if (existsSync(new URL('../.env', import.meta.url)))
  process.loadEnvFile(new URL('../.env', import.meta.url));
const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    uid: { type: 'string' },
    grant: { type: 'boolean' },
    revoke: { type: 'boolean' },
    'super-admin': { type: 'boolean' },
  },
});
if (!values.project || !values.uid || Boolean(values.grant) === Boolean(values.revoke)) {
  console.error('Use --project PROJECT_ID --uid USER_UID --grant|--revoke [--super-admin]');
  process.exitCode = 1;
} else if (
  (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== values.project) ||
  (process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_PROJECT_ID !== values.project)
) {
  console.error('O projeto informado difere de FIREBASE_PROJECT_ID. Confira a configuração.');
  process.exitCode = 1;
} else {
  try {
    const app = initializeApp(
      { projectId: values.project, credential: applicationDefault() },
      'clash-cup-role-setup',
    );
    const auth = getAuth(app);
    const user = await auth.getUser(values.uid);
    const claims = { ...user.customClaims, admin: Boolean(values.grant) };
    if (values['super-admin']) claims.superAdmin = Boolean(values.grant);
    if (values.revoke) claims.superAdmin = false;
    await auth.setCustomUserClaims(user.uid, claims);
    if (values.revoke) await auth.revokeRefreshTokens(user.uid);
    console.log(
      values.grant
        ? 'Acesso concedido. Atualize as permissões ou entre novamente no portal.'
        : 'Acesso revogado. As sessões anteriores precisam de novo login.',
    );
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    console.error(
      `Não foi possível alterar o acesso (${/^[a-z/-]+$/i.test(code) ? code : 'unknown'}). Confira projeto, UID e credenciais do servidor.`,
    );
    process.exitCode = 1;
  }
}
