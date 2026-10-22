import { useEffect, useState } from 'react';
import {
  competitions,
  competitionError,
  type Competition,
  type Registration,
} from '@clash-cup/competitions';
import type { SessionUser } from '@clash-cup/session';

type Data = { items: Competition[]; invalid: number; registrations: Registration[] };
type Result = {
  data: Data | null;
  loading: boolean;
  error: string | null;
  registrationError: string | null;
};
const initial: Result = { data: null, loading: true, error: null, registrationError: null };
export function useCompetitionData(user: SessionUser | null, revision: number) {
  const [state, setState] = useState<Result & { key: string }>({ ...initial, key: '' });
  const identity = JSON.stringify([user?.uid ?? null, user?.emailVerified ?? false]);
  const key = `${identity}:${revision}`;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const catalog = await competitions.list();
        let registrations: Registration[] = [];
        let registrationError: string | null = null;
        if (user) {
          try {
            registrations = await competitions.registrations(
              user,
              catalog.items,
              catalog.legacyIds,
            );
          } catch (error) {
            registrationError = competitionError(error);
          }
        }
        if (active)
          setState({
            key,
            data: { ...catalog, registrations },
            loading: false,
            error: null,
            registrationError,
          });
      } catch (error) {
        if (active)
          setState({
            key,
            data: null,
            loading: false,
            error: competitionError(error),
            registrationError: null,
          });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [key, user]);
  if (state.key === key) return state;
  return state.key.startsWith(`${identity}:`) ? { ...state, loading: true } : initial;
}
