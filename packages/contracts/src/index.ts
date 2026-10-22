import { z } from 'zod';
export * from './admin.ts';

export const clashTagSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/^#/, ''))
  .pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Informe uma tag com 3 a 20 letras e números.'));
const statistic = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const cardSchema = z
  .object({
    id: statistic,
    name: z.string().trim().min(1).max(200),
    level: statistic.optional(),
    maxLevel: statistic.optional(),
    iconUrls: z
      .object({ medium: z.string().max(2000).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();
export const playerSchema = z
  .object({
    tag: z.string().trim().min(1),
    name: z.string().trim().min(1).max(200),
    expLevel: statistic.optional(),
    trophies: statistic.optional(),
    bestTrophies: statistic.optional(),
    wins: statistic.optional(),
    losses: statistic.optional(),
    battleCount: statistic.optional(),
    threeCrownWins: statistic.optional(),
    totalDonations: statistic.optional(),
    clan: z
      .object({ tag: z.string().optional(), name: z.string().min(1) })
      .passthrough()
      .nullable()
      .optional(),
    arena: z
      .object({ name: z.string().min(1) })
      .passthrough()
      .nullable()
      .optional(),
    currentDeck: z.array(cardSchema).max(20).optional(),
  })
  .passthrough();
export const upcomingChestsSchema = z
  .object({
    items: z
      .array(z.object({ index: statistic, name: z.string().trim().min(1).max(200) }).passthrough())
      .max(1000),
  })
  .passthrough();
export type PlayerCard = z.infer<typeof cardSchema>;
export type UpcomingChests = z.infer<typeof upcomingChestsSchema>;
export const tournamentSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    membersList: z.array(
      z.object({ tag: z.string(), name: z.string(), score: z.number() }).passthrough(),
    ),
  })
  .passthrough();
const remoteUrlSchema = z
  .url()
  .refine((url) => ['http:', 'https:'].includes(new URL(url).protocol));
export const runtimeConfigSchema = z.object({
  remotes: z.object({
    portal: remoteUrlSchema,
    auth: remoteUrlSchema,
    competition: remoteUrlSchema,
    player: remoteUrlSchema,
    admin: remoteUrlSchema,
  }),
});
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Tournament = z.infer<typeof tournamentSchema>;
export type RemoteName = keyof RuntimeConfig['remotes'];

const emailSchema = z.string().trim().pipe(z.email('Informe um email válido.'));
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(6, 'Use pelo menos 6 caracteres.')
      .max(128, 'Use no máximo 128 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((fields) => fields.password === fields.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais.',
  });
