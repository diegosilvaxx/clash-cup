import { z } from 'zod';

export const clashTagSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/^#/, ''))
  .pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Informe uma tag com 3 a 20 letras e números.'));
export const playerSchema = z.object({ tag: z.string(), name: z.string() }).passthrough();
export const upcomingChestsSchema = z
  .object({ items: z.array(z.object({ index: z.number(), name: z.string() }).passthrough()) })
  .passthrough();
export const tournamentSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    membersList: z.array(
      z.object({ tag: z.string(), name: z.string(), score: z.number() }).passthrough(),
    ),
  })
  .passthrough();
export const runtimeConfigSchema = z.object({
  remotes: z.object({
    portal: z.url().refine((url) => ['http:', 'https:'].includes(new URL(url).protocol)),
  }),
});
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Tournament = z.infer<typeof tournamentSchema>;
