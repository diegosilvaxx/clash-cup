import { getApps, initializeApp } from 'firebase/app';
import { z } from 'zod';

export {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
} from 'firebase/auth';
export {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore/lite';

export class FirebaseConfigurationError extends Error {
  readonly code = 'configuration-missing';
  constructor() {
    super('O Firebase ainda não está configurado neste ambiente.');
  }
}
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
  if (!config.success) throw new FirebaseConfigurationError();
  return config.data;
}
export function getFirebaseApp(env: Record<string, unknown> = import.meta.env) {
  const config = readFirebaseConfig(env);
  return getApps().find((app) => app.name === 'clash-cup') ?? initializeApp(config, 'clash-cup');
}
