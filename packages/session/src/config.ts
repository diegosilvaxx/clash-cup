import { z } from 'zod';
import { SessionError } from './errors';

const schema = z.object({
  apiKey: z.string().trim().min(1),
  authDomain: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9.-]+$/),
  projectId: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  appId: z.string().trim().min(1),
});

export function readFirebaseConfig(env: Record<string, unknown>) {
  const config = schema.safeParse({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  if (!config.success)
    throw new SessionError(
      'configuration-missing',
      'O login ainda não está configurado neste ambiente.',
    );
  return config.data;
}
