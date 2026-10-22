import { describe, expect, it } from 'vitest';
import { parseRankings, parseWallet, rewardError, selectRanking, type RankingData } from './model';

const row = (tag: string, score: number, extra = {}) => ({ tag, name: tag, score, ...extra });
const records = (...data: unknown[]) =>
  data.map((item, index) => ({ id: String(index), data: item }));
function data(current: unknown[] = [], history: unknown[] = []): RankingData {
  return {
    ...parseRankings(records(...current), records(...history)),
    badges: {},
    badgesUnavailable: false,
  };
}
describe('legacy rewards and standings', () => {
  it('preserves zero balances, unknown emblems and optional legacy fields', () => {
    expect(
      parseWallet('old', { idClashRoyale: 'p0y', emotesBuy: ['retired'], use: 'retired' }),
    ).toMatchObject({ gold: 0, idClashRoyale: '#P0Y', emotesBuy: ['retired'], use: 'retired' });
  });
  it.each([-1, 1.5, '10', NaN, Number.MAX_SAFE_INTEGER + 1])(
    'refuses an invalid financial amount %s',
    (gold) => {
      expect(() => parseWallet('old', { idClashRoyale: '#P0Y', gold })).toThrow('revisão');
    },
  );
  it('includes a single participant and zero scores, with a stable tie order', () => {
    const ranking = data([row('#ZZZ', 0), row('#AAA', 0)]);
    expect(selectRanking(ranking, { mode: 'current', period: '' }).map((item) => item.tag)).toEqual(
      ['#AAA', '#ZZZ'],
    );
    expect(selectRanking(data([row('#AAA', 0)]), { mode: 'current', period: '' })).toHaveLength(1);
  });
  it('sums different months without adding the current ranking again', () => {
    const ranking = data(
      [row('#AAA', 100)],
      [
        row('#AAA', 3, { month: 1, year: 2026 }),
        row('#AAA', 2, { month: 2, year: 2026 }),
        row('#AAA', 9, { month: 1, year: 2025 }),
      ],
    );
    expect(selectRanking(ranking, { mode: 'year', period: '2026' })[0]?.score).toBe(5);
    expect(selectRanking(ranking, { mode: 'month', period: '2026-01' })[0]?.score).toBe(3);
    expect(selectRanking(ranking, { mode: 'month', period: '2026-03' })).toEqual([]);
  });
  it('omits every ambiguous duplicate instead of doubling its points', () => {
    const ranking = data(
      [row('#AAA', 4), row('#aaa', 5), row('#BBB', -1)],
      [
        row('#CCC', 2, { month: 2, year: 2026 }),
        row('#ccc', 3, { month: 2, year: 2026 }),
        row('#DDD', 1, { month: 13, year: 2026 }),
      ],
    );
    expect(ranking.current).toEqual([]);
    expect(ranking.history).toEqual([]);
    expect(ranking.invalid).toBe(6);
  });
  it('rejects unsafe annual totals and sanitizes infrastructure errors', () => {
    const ranking = data(
      [],
      [
        row('#AAA', Number.MAX_SAFE_INTEGER, { month: 1, year: 2026 }),
        row('#AAA', 1, { month: 2, year: 2026 }),
      ],
    );
    expect(() => selectRanking(ranking, { mode: 'year', period: '2026' })).toThrow('revisão');
    expect(rewardError(new Error('token=private'))).not.toContain('private');
  });
});
