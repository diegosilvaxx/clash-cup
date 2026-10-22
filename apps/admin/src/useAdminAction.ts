import { useEffect, useRef, useState } from 'react';
import { session } from '@clash-cup/session';
import { adminError } from './client';

export function useAdminAction(uid: string) {
  const mounted = useRef(false);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<unknown>, success: () => void) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
      if (mounted.current && session.getSnapshot().user?.uid === uid) success();
    } catch (failure) {
      if (mounted.current && session.getSnapshot().user?.uid === uid) setError(adminError(failure));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { pending, error, setError, run };
}
