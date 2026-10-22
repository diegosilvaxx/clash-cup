import type { Route } from '@playwright/test';

type Value = {
  stringValue?: string;
  integerValue?: string;
  timestampValue?: string;
  arrayValue?: { values?: Value[] };
  mapValue?: { fields: Record<string, Value> };
};
type RecordData = Record<string, Value>;
type Document = { name: string; fields: RecordData; createTime: string; updateTime: string };
type Write = {
  update?: { name: string; fields: RecordData };
  delete?: string;
  verify?: string;
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: { fieldPath: string; setToServerValue: string }[];
  currentDocument?: { exists?: boolean; updateTime?: string };
};
export type RewardFixtureOptions = {
  wallet?: 'claimed' | 'unclaimed' | 'missing';
  gold?: number;
  owned?: string[];
  ranking?: 'available' | 'empty';
};
export type CompetitionFixtureOptions = {
  rewards?: RewardFixtureOptions;
  empty?: boolean;
  full?: boolean;
  legacy?: boolean;
  ambiguous?: boolean;
};
const base = 'projects/demo-clash-cup/databases/(default)/documents/';
const str = (value: string): Value => ({ stringValue: value });
export function createCompetitionFixture(options: CompetitionFixtureOptions = {}) {
  const documents = new Map<string, Document>();
  let version = 0;
  let denied = false;
  let failCommit = false;
  let conflict = false;
  let shopConflict = false;
  let commits = 0;
  function time() {
    return (
      new Date(Date.UTC(2026, 9, 22, 12, 0, 0, ++version)).toISOString().slice(0, -1) + '000000Z'
    );
  }
  function seed(path: string, fields: RecordData) {
    const stamp = time();
    documents.set(base + path, { name: base + path, fields, createTime: stamp, updateTime: stamp });
  }
  if (!options.empty) {
    seed('tournament/cup', {
      id: str('legacy-day'),
      name: str('Copa da comunidade'),
      description: str('Batalhas amistosas para a comunidade.'),
      date: str('2026-11-15T20:00'),
      vacancies: str('2'),
      vacanciesAvailable: str(options.full ? '2' : '1'),
      tournamentLink: str('https://link.clashroyale.com/'),
    });
    if (options.ambiguous)
      seed('tournament/duplicate', {
        id: str('legacy-day'),
        name: str('Outro torneio no mesmo dia'),
        vacancies: str('10'),
        vacanciesAvailable: str('1'),
      });
    if (options.legacy)
      seed('myTournament/legacy-day-player@example.test', {
        idTournament: str('legacy-day'),
        idUser: str('player@example.test'),
        registeredAt: str('2026-10-12'),
      });
  }
  if (options.rewards) {
    const reward = options.rewards;
    if (reward.wallet !== 'missing')
      seed('shop/#P0Y', {
        idClashRoyale: str('#P0Y'),
        ...(reward.wallet !== 'unclaimed' ? { ownerUid: str('fixture-user') } : {}),
        gold: { integerValue: String(reward.gold ?? 10) },
        emotesBuy: { arrayValue: { values: (reward.owned ?? []).map(str) } },
        use: str(''),
      });
    if (reward.ranking !== 'empty') {
      seed('ranking/#P0Y', {
        tag: str('#P0Y'),
        name: str('Jogador de teste'),
        score: { integerValue: '0' },
      });
      seed('ranking/#AAA', {
        tag: str('#AAA'),
        name: str('Líder da comunidade'),
        score: { integerValue: '20' },
      });
      for (const [month, score] of [
        [1, 3],
        [2, 2],
      ])
        seed(`rankingHistory/#P0Y_${month}_2026`, {
          tag: str('#P0Y'),
          name: str('Jogador de teste'),
          score: { integerValue: String(score) },
          month: { integerValue: String(month) },
          year: { integerValue: '2026' },
        });
    }
  }
  async function handle(
    route: Route,
    reply: (options: NonNullable<Parameters<Route['fulfill']>[0]>) => Promise<void>,
  ) {
    const path = new URL(route.request().url()).pathname;
    if (!/:(runQuery|batchGet|commit)$/.test(path)) return false;
    if (denied) {
      await reply({
        status: 403,
        json: { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Fixture denied' } },
      });
      return true;
    }
    if (path.endsWith(':runQuery')) {
      const body = route.request().postDataJSON() as {
        structuredQuery: {
          from: { collectionId: string }[];
          where?: { fieldFilter?: { field: { fieldPath: string }; value: Value } };
        };
      };
      const parent = decodeURIComponent(path.slice('/v1/'.length).replace(/:runQuery$/, ''));
      const prefix = parent + '/' + body.structuredQuery.from[0]!.collectionId + '/';
      const filter = body.structuredQuery.where?.fieldFilter;
      const matches = [...documents.values()].filter(
        (document) =>
          document.name.startsWith(prefix) &&
          !document.name.slice(prefix.length).includes('/') &&
          (!filter ||
            JSON.stringify(document.fields[filter.field.fieldPath]) ===
              JSON.stringify(filter.value)),
      );
      await reply({
        json: matches.length
          ? matches.map((document) => ({ document, readTime: time() }))
          : [{ readTime: time() }],
      });
      return true;
    }
    if (path.endsWith(':batchGet')) {
      const body = route.request().postDataJSON() as { documents: string[] };
      await reply({
        json: body.documents.map((name) =>
          documents.has(name)
            ? { found: documents.get(name), readTime: time() }
            : { missing: name, readTime: time() },
        ),
      });
      return true;
    }
    const writes = (route.request().postDataJSON() as { writes: Write[] }).writes;
    if (failCommit) {
      await reply({
        status: 403,
        json: {
          error: { code: 403, status: 'PERMISSION_DENIED', message: 'Fixture failed commit' },
        },
      });
      return true;
    }
    if (conflict) {
      conflict = false;
      const tournament = documents.get(base + 'tournament/cup')!;
      tournament.fields.vacanciesAvailable = { integerValue: '2' };
      tournament.updateTime = time();
    }
    if (shopConflict) {
      shopConflict = false;
      const wallet = documents.get(base + 'shop/#P0Y')!;
      wallet.fields.gold = { integerValue: '5' };
      wallet.fields.emotesBuy = { arrayValue: { values: [str('blow')] } };
      wallet.updateTime = time();
    }
    const invalid = writes.some((write) => {
      const existing = documents.get(write.update?.name ?? write.delete ?? write.verify ?? '');
      return (
        write.currentDocument &&
        ((write.currentDocument.exists !== undefined &&
          Boolean(existing) !== write.currentDocument.exists) ||
          (write.currentDocument.updateTime !== undefined &&
            existing?.updateTime !== write.currentDocument.updateTime))
      );
    });
    if (invalid) {
      await reply({
        status: 409,
        json: { error: { code: 409, status: 'ABORTED', message: 'Fixture concurrent write' } },
      });
      return true;
    }
    const stamp = time();
    for (const write of writes) {
      if (write.delete) documents.delete(write.delete);
      if (write.update) {
        const previous = documents.get(write.update.name);
        const fields: RecordData = write.updateMask
          ? { ...previous?.fields, ...write.update.fields }
          : { ...write.update.fields };
        for (const transform of write.updateTransforms ?? []) {
          const segments = transform.fieldPath.split('.');
          let target = fields;
          for (const segment of segments.slice(0, -1)) {
            target[segment] ??= { mapValue: { fields: {} } };
            target = target[segment]!.mapValue!.fields;
          }
          target[segments.at(-1)!] = { timestampValue: stamp };
        }
        documents.set(write.update.name, {
          name: write.update.name,
          fields,
          createTime: previous?.createTime ?? stamp,
          updateTime: stamp,
        });
      }
    }
    ++commits;
    await reply({
      json: { commitTime: stamp, writeResults: writes.map(() => ({ updateTime: stamp })) },
    });
    return true;
  }
  return {
    handle,
    deny: (value: boolean) => {
      denied = value;
    },
    failCommit: (value: boolean) => {
      failCommit = value;
    },
    fillDuringCommit: () => {
      conflict = true;
    },
    spendDuringShopCommit: () => {
      shopConflict = true;
    },
    getGold: () => Number(documents.get(base + 'shop/#P0Y')?.fields.gold?.integerValue),
    getOwned: () =>
      documents
        .get(base + 'shop/#P0Y')
        ?.fields.emotesBuy?.arrayValue?.values?.map((value) => value.stringValue) ?? [],
    getCommits: () => commits,
    getOccupied: () => {
      const value = documents.get(base + 'tournament/cup')?.fields.vacanciesAvailable;
      return Number(value?.integerValue ?? value?.stringValue);
    },
  };
}
