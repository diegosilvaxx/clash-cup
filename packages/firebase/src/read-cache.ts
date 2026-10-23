export type ReadOptions = { force?: boolean };
type Entry = {
  value?: unknown;
  error?: unknown;
  failed?: boolean;
  expires: number;
  pending?: Promise<unknown>;
};

// No timers: expired entries are refreshed on the next request only.
export function createReadCache(ttl = 120_000, now: () => number = Date.now) {
  const entries = new Map<string, Entry>();
  return {
    read<T>(key: string, load: () => Promise<T>, options: ReadOptions = {}): Promise<T> {
      const previous = entries.get(key);
      if (previous?.pending) return previous.pending as Promise<T>;
      if (!options.force && previous && previous.expires > now())
        return previous.failed
          ? Promise.reject(previous.error)
          : Promise.resolve(previous.value as T);
      const entry: Entry = { expires: 0 };
      const pending = Promise.resolve()
        .then(load)
        .then(
          (value) => {
            if (entries.get(key) === entry) {
              entry.value = value;
              entry.expires = now() + ttl;
              delete entry.pending;
            }
            return value;
          },
          (error) => {
            if (entries.get(key) === entry) {
              entry.error = error;
              entry.failed = true;
              entry.expires = now() + 10_000;
              delete entry.pending;
            }
            throw error;
          },
        );
      entry.pending = pending;
      entries.set(key, entry);
      return pending;
    },
    invalidate(key?: string) {
      if (key === undefined) entries.clear();
      else entries.delete(key);
    },
  };
}
