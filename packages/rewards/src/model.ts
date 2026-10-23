import { z } from 'zod';
import { clashTagSchema } from '@clash-cup/contracts';

export class RewardError extends Error {}
export function rewardError(error: unknown) {
  if (error instanceof RewardError) return error.message;
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === 'resource-exhausted')
    return 'O Firestore atingiu um limite de uso. Tente novamente mais tarde.';
  if (code === 'configuration-missing') return 'O Firebase ainda não está configurado.';
  if (code === 'permission-denied')
    return 'Sua conta não tem permissão para esta operação. Peça à organização que confira seu vínculo e as permissões.';
  return 'Não foi possível consultar ou salvar os dados. Tente novamente.';
}
const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const tag = clashTagSchema.transform((value) => `#${value}`);
const walletSchema = z.object({
  idClashRoyale: tag,
  ownerUid: z.string().min(1).optional(),
  gold: amount.default(0),
  emotesBuy: z.array(z.string().min(1).max(100)).max(100).default([]),
  use: z.string().max(100).default(''),
});
export type Wallet = z.infer<typeof walletSchema> & { id: string };
export function parseWallet(id: string, data: unknown): Wallet {
  const result = walletSchema.safeParse(data);
  if (!result.success)
    throw new RewardError('O saldo ou os emblemas precisam de revisão pela organização.');
  return { id, ...result.data };
}
const standingSchema = z.object({
  tag,
  name: z.string().trim().min(1).max(200),
  score: amount,
  clan: z.object({ name: z.string().trim().max(200) }).nullish(),
});
export type Standing = { tag: string; name: string; score: number; clan: string | null };
export type HistoryStanding = Standing & { month: number; year: number };
const historySchema = standingSchema.extend({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(9999),
});
export type RankingData = {
  current: Standing[];
  history: HistoryStanding[];
  badges: Record<string, string>;
  invalid: number;
  badgesUnavailable: boolean;
};
type RecordData = { id: string; data: unknown };
// Duplicate tag/period records are ambiguous: omit the entire group for review.
function parseRecords<T extends Standing>(
  records: RecordData[],
  schema: z.ZodType<T>,
  key: (item: T) => string,
) {
  const groups = new Map<string, T[]>();
  let invalid = 0;
  for (const record of records) {
    const result = schema.safeParse(record.data);
    if (!result.success) {
      ++invalid;
      continue;
    }
    const item = result.data;
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  }
  const items: T[] = [];
  for (const group of groups.values()) {
    if (group.length !== 1) invalid += group.length;
    else items.push(group[0]!);
  }
  return { items, invalid };
}
export function parseRankings(current: RecordData[], history: RecordData[]) {
  const a = parseRecords(
    current,
    standingSchema.transform((item) => ({ ...item, clan: item.clan?.name || null })),
    (item) => item.tag,
  );
  const b = parseRecords(
    history,
    historySchema.transform((item) => ({ ...item, clan: item.clan?.name || null })),
    (item) => `${item.tag}:${item.year}:${item.month}`,
  );
  return { current: a.items, history: b.items, invalid: a.invalid + b.invalid };
}
export type RankingFilter = { mode: 'current' | 'year' | 'month'; period: string };
export function selectRanking(data: RankingData, filter: RankingFilter): Standing[] {
  let rows: Standing[];
  if (filter.mode === 'current') rows = data.current;
  else {
    const records = data.history.filter((item) =>
      filter.mode === 'year'
        ? String(item.year) === filter.period
        : `${item.year}-${String(item.month).padStart(2, '0')}` === filter.period,
    );
    const totals = new Map<string, Standing>();
    for (const item of [...records].sort((a, b) => a.month - b.month)) {
      const score = (totals.get(item.tag)?.score ?? 0) + item.score;
      if (!Number.isSafeInteger(score))
        throw new RewardError('A pontuação acumulada precisa de revisão pela organização.');
      totals.set(item.tag, { tag: item.tag, name: item.name, clan: item.clan, score });
    }
    rows = [...totals.values()];
  }
  // Equal scores share a position; tag provides a stable display order.
  return [...rows].sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
}
