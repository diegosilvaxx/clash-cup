import { useEffect, useSyncExternalStore } from 'react';
import { createFirebaseDriver } from './firebase-driver';
import { createSessionStore } from './store';

export type { PlayerProfile, SessionSnapshot, SessionUser } from './types';
export { getSessionError } from './errors';
export const session = createSessionStore(createFirebaseDriver(import.meta.env));
export function useSession() {
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  useEffect(() => {
    void session.start();
  }, []);
  return snapshot;
}
