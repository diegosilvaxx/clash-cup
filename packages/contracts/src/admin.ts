import { z } from 'zod';

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const documentIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\s]+$/);
export const adminTournamentInputSchema = z.object({
  id: documentIdSchema,
  name: z.string().trim().min(1, 'Informe o nome.').max(200),
  description: z.string().max(10000),
  date: z.string().max(100),
  tournamentLink: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      } catch {
        return false;
      }
    }, 'Informe um link HTTPS válido.'),
  vacancies: amount.min(1, 'Informe pelo menos uma vaga.'),
  status: z.enum(['open', 'closed']),
});
export const adminTournamentSchema = adminTournamentInputSchema.extend({ occupied: amount });
export const adminWalletSchema = z.object({
  id: documentIdSchema,
  tag: z.string(),
  gold: amount,
  ownerUid: z.string().nullable(),
});
export const walletBindingSchema = z.object({
  walletId: documentIdSchema,
  uid: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[^/\s]+$/),
  reason: z.string().trim().min(5, 'Descreva a verificação realizada.').max(500),
  verifiedOwnership: z.literal(true, { error: 'Confirme a verificação de titularidade.' }),
});
export const importPeriodSchema = z.object({
  tag: z.string().trim().min(3).max(21),
  year: z.number().int().min(2000).max(9999),
  month: z.number().int().min(1).max(12),
});
export const importStartSchema = importPeriodSchema.extend({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  confirmedNew: z.literal(true, {
    error: 'Confirme que o resultado ainda não foi creditado no legado.',
  }),
});
export const resultMemberSchema = z.object({
  tag: z.string().regex(/^#[A-Z0-9]{3,20}$/),
  name: z.string().trim().min(1).max(200),
  score: amount,
  clan: z.object({ name: z.string().max(200) }).nullable(),
});
export const importJobSchema = z.object({
  id: documentIdSchema,
  tag: z.string(),
  name: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  total: amount,
  processed: amount,
  status: z.enum(['processing', 'completed']),
});
export const importPreviewSchema = z.object({
  tag: z.string(),
  name: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  members: z.array(resultMemberSchema).max(1000),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  existing: importJobSchema.nullable(),
});
export const adminRoleSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  superAdmin: z.boolean(),
});
export const roleChangeSchema = z.object({ email: z.email(), action: z.enum(['grant', 'revoke']) });
export const adminOverviewSchema = z.object({
  tournaments: z.array(adminTournamentSchema),
  invalidTournaments: amount,
  wallets: z.array(adminWalletSchema),
  invalidWallets: amount,
  imports: z.array(importJobSchema),
  invalidImports: amount,
});
export type AdminTournament = z.infer<typeof adminTournamentSchema>;
export type AdminTournamentInput = z.infer<typeof adminTournamentInputSchema>;
export type WalletBinding = z.infer<typeof walletBindingSchema>;
export type ImportPeriod = z.infer<typeof importPeriodSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type ResultMember = z.infer<typeof resultMemberSchema>;
export type ImportPreview = z.infer<typeof importPreviewSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminRole = z.infer<typeof adminRoleSchema>;
export type AdminPrincipal = { uid: string; superAdmin: boolean };
