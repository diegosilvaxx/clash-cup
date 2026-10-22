import type { Firestore } from 'firebase-admin/firestore';
type Data = Record<string, unknown>;
type Snapshot = { id: string; ref: Reference; exists: boolean; data: () => Data | undefined };
type QuerySnapshot = { docs: Snapshot[]; size: number };
type Reference = {
  kind: 'document';
  path: string;
  id: string;
  collection: (name: string) => Collection;
  get: () => Promise<Snapshot>;
  set: (data: Data) => Promise<void>;
  update: (data: Data) => Promise<void>;
};
type Query = {
  kind: 'query';
  path: string;
  filters: [string, unknown][];
  get: () => Promise<QuerySnapshot>;
};
type Collection = Query & {
  doc: (id?: string) => Reference;
  where: (field: string, operation: string, value: unknown) => Query;
};

export function createAdminDatabase(initial: Record<string, Data> = {}) {
  const records = new Map(Object.entries(initial));
  let version = 0;
  let auto = 0;
  let commits = 0;
  let fail = false;
  let conflict: (() => void) | null = null;
  function snapshot(path: string, source = records): Snapshot {
    return {
      id: path.split('/').at(-1)!,
      ref: document(path),
      exists: source.has(path),
      data: () => source.get(path),
    };
  }
  function querySnapshot(target: Query, source = records): QuerySnapshot {
    const docs = [...source.keys()]
      .filter(
        (path) =>
          path.startsWith(target.path + '/') &&
          !path.slice(target.path.length + 1).includes('/') &&
          target.filters.every(([key, value]) => source.get(path)?.[key] === value),
      )
      .map((path) => snapshot(path, source));
    return { docs, size: docs.length };
  }
  function document(path: string): Reference {
    return {
      kind: 'document',
      path,
      id: path.split('/').at(-1)!,
      collection: (name) => collection(`${path}/${name}`),
      get: async () => snapshot(path),
      set: async (data) => {
        records.set(path, data);
        ++version;
      },
      update: async (data) => {
        records.set(path, { ...records.get(path), ...data });
        ++version;
      },
    };
  }
  function query(path: string, filters: [string, unknown][]): Query {
    const value: Query = { kind: 'query', path, filters, get: async () => querySnapshot(value) };
    return value;
  }
  function collection(path: string): Collection {
    return {
      ...query(path, []),
      doc: (id = `auto-${++auto}`) => document(`${path}/${id}`),
      where: (field, _operation, value) => query(path, [[field, value]]),
    };
  }
  return {
    records,
    getCommits: () => commits,
    seed: (path: string, data: Data) => {
      records.set(path, data);
      ++version;
    },
    conflictOnce: (callback: () => void) => {
      conflict = callback;
    },
    failNextCommit: () => {
      fail = true;
    },
    database: {
      collection,
      async runTransaction<T>(action: (tx: unknown) => Promise<T>): Promise<T> {
        for (let attempt = 0; attempt < 20; ++attempt) {
          const readVersion = version;
          const source = new Map(records);
          const writes: {
            kind: 'create' | 'update' | 'set';
            ref: Reference;
            data: Data;
            merge?: boolean;
          }[] = [];
          const result = await action({
            get: async (target: Reference | Query) =>
              target.kind === 'document'
                ? snapshot(target.path, source)
                : querySnapshot(target, source),
            getAll: async (...refs: Reference[]) => refs.map((ref) => snapshot(ref.path, source)),
            create: (ref: Reference, data: Data) => writes.push({ kind: 'create', ref, data }),
            update: (ref: Reference, data: Data) => writes.push({ kind: 'update', ref, data }),
            set: (ref: Reference, data: Data, options?: { merge: boolean }) =>
              writes.push({ kind: 'set', ref, data, merge: options?.merge ?? false }),
          });
          if (conflict) {
            const update = conflict;
            conflict = null;
            update();
          }
          if (readVersion !== version) continue;
          if (fail && writes.length) {
            fail = false;
            throw new Error('simulated commit failure');
          }
          for (const write of writes) {
            if (write.kind === 'create' && records.has(write.ref.path))
              throw new Error('already exists');
            if (write.kind === 'update' && !records.has(write.ref.path))
              throw new Error('missing document');
          }
          for (const write of writes)
            records.set(
              write.ref.path,
              write.kind === 'update' || write.merge
                ? { ...records.get(write.ref.path), ...write.data }
                : write.data,
            );
          if (writes.length) {
            ++commits;
            ++version;
          }
          return result;
        }
        throw new Error('transaction conflicts');
      },
    } as unknown as Firestore,
  };
}
