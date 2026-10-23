import { z } from 'zod';

const scoreSchema = z.tuple([z.number().int().min(0).max(3), z.number().int().min(0).max(3)]);
export const championshipSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe um nome com pelo menos 3 caracteres.').max(80),
    description: z.string().trim().max(1000),
    size: z.union([z.literal(8), z.literal(16), z.literal(32)]),
    players: z.array(z.string().trim().max(40)).min(8).max(32),
    startsAt: z
      .string()
      .max(40)
      .refine(
        (value) => value === '' || Number.isFinite(Date.parse(value)),
        'Informe uma data válida.',
      ),
    bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
    thirdPlace: z.boolean(),
    cover: z
      .string()
      .max(200000)
      .refine(
        (value) => value === '' || /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value),
        'Selecione uma imagem válida.',
      ),
    status: z.enum(['draft', 'published']),
    scores: z.record(z.string(), scoreSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.players.length !== data.size)
      ctx.addIssue({
        code: 'custom',
        path: ['players'],
        message: 'A lista deve ter o número de jogadores escolhido.',
      });
    const names = data.players.filter(Boolean).map((name) => name.toLocaleLowerCase('pt-BR'));
    if (new Set(names).size !== names.length)
      ctx.addIssue({
        code: 'custom',
        path: ['players'],
        message: 'Use nomes diferentes para identificar cada jogador.',
      });
    if (data.status === 'published' && names.length !== data.size)
      ctx.addIssue({
        code: 'custom',
        path: ['players'],
        message: 'Preencha todos os jogadores antes de publicar.',
      });
    if (data.status === 'draft' && Object.keys(data.scores).length)
      ctx.addIssue({
        code: 'custom',
        path: ['scores'],
        message: 'Publique o campeonato antes de registrar resultados.',
      });
    const rounds = buildBracket(data);
    const matches = [...rounds.flat(), ...(data.thirdPlace ? [bronzeMatch(data)] : [])];
    for (const [key, score] of Object.entries(data.scores)) {
      const match = matches.find((item) => item.key === key);
      const target = Math.ceil(data.bestOf / 2);
      if (
        !match ||
        match.players.some((player) => player === null) ||
        Math.max(...score) !== target ||
        Math.min(...score) >= target
      )
        ctx.addIssue({
          code: 'custom',
          path: ['scores', key],
          message: 'O placar precisa definir um vencedor e respeitar o formato da partida.',
        });
    }
  });
export type ChampionshipInput = z.infer<typeof championshipSchema>;
export type Championship = ChampionshipInput & { id: string; ownerUid: string; revision: number };
export type BracketMatch = {
  key: string;
  players: [number | null, number | null];
  score: [number, number] | null;
  winner: number | null;
};

function makeMatch(
  key: string,
  players: BracketMatch['players'],
  data: ChampionshipInput,
): BracketMatch {
  const score = data.scores[key] ?? null;
  const target = Math.ceil(data.bestOf / 2);
  const valid =
    score &&
    players.every((player) => player !== null) &&
    Math.max(...score) === target &&
    Math.min(...score) < target;
  return { key, players, score, winner: valid ? players[score[0] > score[1] ? 0 : 1] : null };
}
export function buildBracket(data: ChampionshipInput): BracketMatch[][] {
  const rounds: BracketMatch[][] = [];
  let players: (number | null)[] = Array.from({ length: data.size }, (_, index) =>
    data.players[index] ? index : null,
  );
  for (let round = 0; players.length > 1; round++) {
    const matches = Array.from({ length: players.length / 2 }, (_, index) =>
      makeMatch(
        `${round}-${index}`,
        [players[index * 2] ?? null, players[index * 2 + 1] ?? null],
        data,
      ),
    );
    rounds.push(matches);
    players = matches.map((match) => match.winner);
  }
  return rounds;
}
export function bronzeMatch(data: ChampionshipInput): BracketMatch {
  const semifinal = buildBracket(data).at(-2) ?? [];
  const losers = semifinal.map((match) =>
    match.winner === null
      ? null
      : (match.players.find((player) => player !== match.winner) ?? null),
  );
  return makeMatch('bronze', [losers[0] ?? null, losers[1] ?? null], data);
}
export function recordScore(
  data: ChampionshipInput,
  key: string,
  score: [number, number],
): ChampionshipInput {
  const scores = { ...data.scores, [key]: score };
  if (key !== 'bronze') {
    const [round, index] = key.split('-').map(Number) as [number, number];
    let next = index;
    for (let level = round + 1; level < Math.log2(data.size); level++) {
      next = Math.floor(next / 2);
      delete scores[`${level}-${next}`];
    }
    if (round <= Math.log2(data.size) - 2) delete scores.bronze;
  }
  return championshipSchema.parse({ ...data, scores });
}
export function shufflePlayers(players: string[], random: () => number = Math.random): string[] {
  const result = [...players];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next]!, result[index]!];
  }
  return result;
}
export function roundLabel(index: number, count: number) {
  return (
    ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final', '16 avos de final'][
      count - index - 1
    ] ?? 'Rodada'
  );
}
export function emptyChampionship(): ChampionshipInput {
  return {
    name: '',
    description: '',
    size: 8,
    players: Array<string>(8).fill(''),
    startsAt: '',
    bestOf: 3,
    thirdPlace: false,
    cover: '',
    status: 'draft',
    scores: {},
  };
}
