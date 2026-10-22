import { z } from 'zod';

const count = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
const schema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(''),
  date: z.string().max(100).default(''),
  vacancies: count,
  vacanciesAvailable: count,
  id: z.string().max(200).optional(),
  tournamentLink: z.string().max(2000).default(''),
  status: z.enum(['open', 'closed']).default('open'),
});
export type Competition = {
  id: string;
  legacyId: string | null;
  name: string;
  description: string;
  date: string;
  capacity: number;
  occupied: number;
  remaining: number;
  link: string | null;
  open: boolean;
};
export type Registration = {
  id: string;
  tournamentId: string | null;
  legacyId: string | null;
  source: 'current' | 'legacy';
  problem: string | null;
};
export class CompetitionError extends Error {}
export function safeTournamentLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export function parseCompetition(id: string, value: unknown): Competition {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new CompetitionError(
      'Este torneio possui dados inválidos. Entre em contato com a organização.',
    );
  const data = parsed.data;
  if (data.vacanciesAvailable > data.vacancies)
    throw new CompetitionError(
      'A contagem de vagas deste torneio precisa ser revisada pela organização.',
    );
  return {
    id,
    legacyId: data.id ?? null,
    name: data.name,
    description: data.description,
    date: data.date,
    capacity: data.vacancies,
    occupied: data.vacanciesAvailable,
    remaining: data.vacancies - data.vacanciesAvailable,
    link: safeTournamentLink(data.tournamentLink),
    open: data.status === 'open',
  };
}
export function resolveLegacyRegistration(
  id: string,
  data: Record<string, unknown>,
  competitions: Competition[],
  legacyIds?: ReadonlyMap<string, readonly string[]>,
): Registration {
  const legacyId = typeof data.idTournament === 'string' ? data.idTournament : null;
  const matches = legacyId ? competitions.filter((item) => item.legacyId === legacyId) : [];
  const matchCount = (legacyId && legacyIds?.get(legacyId)?.length) || matches.length;
  return {
    id,
    source: 'legacy',
    legacyId,
    tournamentId: matchCount === 1 && matches.length === 1 ? matches[0]!.id : null,
    problem:
      matchCount > 1
        ? 'Há mais de um torneio com este identificador antigo. Solicite a revisão à organização.'
        : matches.length === 0
          ? 'O torneio desta inscrição antiga não está disponível.'
          : null,
  };
}
export function competitionError(error: unknown) {
  if (error instanceof CompetitionError) return error.message;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'configuration-missing')
    return 'Os torneios ainda não estão configurados neste ambiente.';
  if (code === 'permission-denied')
    return 'Não foi possível acessar os torneios. Confira as permissões com a organização.';
  if (code === 'aborted')
    return 'As vagas foram alteradas durante a inscrição. Atualize e tente novamente.';
  if (code === 'unauthenticated') return 'Sua sessão expirou. Entre novamente.';
  return 'Não foi possível concluir a operação. Confira sua conexão e tente novamente.';
}
