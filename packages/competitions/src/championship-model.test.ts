import { describe, expect, it } from 'vitest';
import {
  emptyChampionship,
  championshipSchema,
  buildBracket,
  recordScore,
  bronzeMatch,
  shufflePlayers,
  type ChampionshipInput,
} from './championship-model';
function cup(size: 8 | 16 | 32 = 8, bestOf: 1 | 3 | 5 = 3): ChampionshipInput {
  return {
    ...emptyChampionship(),
    name: 'Copa dos Reis',
    status: 'published',
    size,
    bestOf,
    players: Array.from({ length: size }, (_, index) => `Jogador ${index + 1}`),
    thirdPlace: true,
  };
}
describe('community championship brackets', () => {
  it.each([8, 16, 32] as const)('generates %i distinct seeds and exactly n-1 matches', (size) => {
    const rounds = buildBracket(cup(size));
    expect(rounds).toHaveLength(Math.log2(size));
    expect(rounds.flat()).toHaveLength(size - 1);
    expect(rounds[0]!.flatMap((match) => match.players)).toEqual(
      Array.from({ length: size }, (_, index) => index),
    );
    expect(
      rounds
        .slice(1)
        .flat()
        .every((match) => match.players.every((player) => player === null)),
    ).toBe(true);
  });
  it.each([1, 3, 5] as const)(
    'advances winners and semifinal losers for a best-of-%i tournament',
    (bestOf) => {
      let data = cup(8, bestOf);
      const score: [number, number] = [Math.ceil(bestOf / 2), 0];
      for (let round = 0; round < 3; round++) {
        for (const match of buildBracket(data)[round]!) data = recordScore(data, match.key, score);
      }
      expect(buildBracket(data).at(-1)![0]!.winner).toBe(0);
      expect(bronzeMatch(data).players).toEqual([2, 6]);
      data = recordScore(data, 'bronze', score);
      expect(bronzeMatch(data).winner).toBe(2);
    },
  );
  it('clears only dependent results after correcting a quarterfinal', () => {
    let data = cup();
    for (let round = 0; round < 3; round++)
      for (const match of buildBracket(data)[round]!) data = recordScore(data, match.key, [2, 0]);
    data = recordScore(data, 'bronze', [2, 0]);
    data = recordScore(data, '0-0', [0, 2]);
    expect(data.scores['0-1']).toEqual([2, 0]);
    expect(data.scores['1-1']).toEqual([2, 0]);
    expect(data.scores['1-0']).toBeUndefined();
    expect(data.scores['2-0']).toBeUndefined();
    expect(data.scores.bronze).toBeUndefined();
    expect(buildBracket(data)[1]![0]!.players).toEqual([1, 2]);
  });
  it('rejects ties, unfinished, excessive, fractional and premature results', () => {
    for (const score of [
      [1, 1],
      [1, 0],
      [3, 0],
      [0.5, 2],
      [-1, 2],
    ])
      expect(() => recordScore(cup(), '0-0', score as [number, number])).toThrow();
    expect(() => recordScore(cup(), '1-0', [2, 0])).toThrow();
    expect(() => recordScore(cup(), 'bogus', [2, 0])).toThrow();
    expect(() => recordScore({ ...cup(), thirdPlace: false }, 'bronze', [2, 0])).toThrow();
  });
  it('allows incomplete private drafts but requires a full unique roster to publish', () => {
    const draft = { ...emptyChampionship(), name: 'Copa' };
    expect(championshipSchema.safeParse(draft).success).toBe(true);
    expect(championshipSchema.safeParse({ ...draft, status: 'published' }).success).toBe(false);
    expect(
      championshipSchema.safeParse({
        ...cup(),
        players: [' Ana ', 'ana', ...cup().players.slice(2)],
      }).success,
    ).toBe(false);
    expect(
      championshipSchema.safeParse({ ...cup(), players: cup().players.slice(1) }).success,
    ).toBe(false);
  });
  it('rejects scripts, oversized images and invalid dates', () => {
    for (const cover of [
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'x'.repeat(200001),
    ])
      expect(championshipSchema.safeParse({ ...cup(), cover }).success).toBe(false);
    expect(championshipSchema.safeParse({ ...cup(), startsAt: 'invalid' }).success).toBe(false);
  });
  it('shuffles a copy without dropping players or mutating the input', () => {
    const players = cup().players;
    const shuffled = shufflePlayers(players, () => 0);
    expect(shuffled).not.toEqual(players);
    expect([...shuffled].sort()).toEqual([...players].sort());
    expect(players[0]).toBe('Jogador 1');
  });
});
