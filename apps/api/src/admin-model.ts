import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  clashTagSchema,
  importJobSchema,
  resultMemberSchema,
  type ImportPeriod,
  type ImportJob,
} from '@clash-cup/contracts';
import { ApiError } from './errors';

export function canonicalTag(value: string) {
  return `#${clashTagSchema.parse(value)}`;
}
export const safeAmount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const legacyCount = z.union([
  safeAmount,
  z.string().regex(/^\d+$/).transform(Number).pipe(safeAmount),
]);
export const legacyWalletSchema = z.object({
  idClashRoyale: z.string(),
  gold: safeAmount.default(0),
  ownerUid: z.string().min(1).optional(),
});
export const storedImportSchema = importJobSchema
  .extend({ members: z.array(resultMemberSchema).max(1000), fingerprint: z.string().length(64) })
  .refine(
    (job) =>
      job.total === job.members.length &&
      job.processed <= job.total &&
      (job.status === 'completed') === (job.processed === job.total),
  );
export function snapshotResults(value: unknown, period: ImportPeriod) {
  const schema = z.object({
    tag: z.string(),
    name: z.string().trim().min(1).max(200),
    status: z.literal('ended'),
    membersList: z
      .array(
        z.object({
          tag: z.string(),
          name: z.string(),
          score: safeAmount,
          clan: z.object({ name: z.string() }).nullish(),
        }),
      )
      .min(1)
      .max(1000),
  });
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(
      409,
      'INVALID_RESULTS',
      'O torneio precisa estar encerrado e possuir resultados válidos para importação.',
    );
  const source = parsed.data;
  if (canonicalTag(source.tag) !== canonicalTag(period.tag))
    throw new ApiError(409, 'TAG_MISMATCH', 'A resposta não corresponde ao torneio solicitado.');
  const members = source.membersList
    .map((item) =>
      resultMemberSchema.parse({ ...item, tag: canonicalTag(item.tag), clan: item.clan ?? null }),
    )
    .sort((a, b) => a.tag.localeCompare(b.tag));
  if (new Set(members.map((item) => item.tag)).size !== members.length)
    throw new ApiError(
      409,
      'DUPLICATE_RESULTS',
      'O resultado possui jogadores duplicados e precisa de revisão.',
    );
  const content = JSON.stringify({
    tag: canonicalTag(period.tag),
    year: period.year,
    month: period.month,
    members,
  });
  if (Buffer.byteLength(content) > 700_000)
    throw new ApiError(
      409,
      'RESULTS_TOO_LARGE',
      'O resultado excede o tamanho permitido para importação.',
    );
  return {
    tag: canonicalTag(period.tag),
    name: source.name,
    year: period.year,
    month: period.month,
    members,
    fingerprint: createHash('sha256').update(content).digest('hex'),
  };
}
export function jobSummary(value: unknown): ImportJob {
  return importJobSchema.parse(value);
}
export function addAmount(current: unknown, delta: number) {
  const parsed = safeAmount.safeParse(current);
  if (!parsed.success || !Number.isSafeInteger(parsed.data + delta))
    throw new ApiError(
      409,
      'INVALID_BALANCE',
      'A pontuação ou o saldo existente precisa de revisão.',
    );
  return parsed.data + delta;
}
export function requirePeriod(job: ImportJob, period: ImportPeriod) {
  if (job.year !== period.year || job.month !== period.month)
    throw new ApiError(
      409,
      'IMPORT_PERIOD_CONFLICT',
      'Este torneio já está associado a outro período. Confira a importação existente.',
    );
}
