import { useEffect, useState } from 'react';
import { playerError } from './api';

export function usePlayerResource<T>(
  uid: string,
  tag: string,
  load: (tag: string, signal: AbortSignal) => Promise<T>,
) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([uid, tag, revision]);
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null }>({
    key: '',
    data: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    void load(tag, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error: playerError(error) });
      },
    );
    return () => controller.abort();
  }, [key, load, tag]);
  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : null,
    loading: result.key !== key,
    refresh: () => setRevision((value) => value + 1),
  };
}
