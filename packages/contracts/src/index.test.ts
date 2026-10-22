import { describe, expect, it } from 'vitest';
import {
  clashTagSchema,
  playerSchema,
  upcomingChestsSchema,
  runtimeConfigSchema,
  tournamentSchema,
} from './index';

describe('contracts', () => {
  it('validates consumed player fields while accepting missing optional statistics', () => {
    expect(
      playerSchema.parse({ tag: '#P0Y', name: 'Player', trophies: 0, clan: null }),
    ).toMatchObject({ trophies: 0 });
    expect(playerSchema.safeParse({ tag: '#P0Y', name: 'Player', trophies: '9000' }).success).toBe(
      false,
    );
    expect(
      playerSchema.safeParse({ tag: '#P0Y', name: 'Player', currentDeck: [{ id: 1 }] }).success,
    ).toBe(false);
    expect(upcomingChestsSchema.safeParse({ items: [{ index: 0.5, name: 'Chest' }] }).success).toBe(
      false,
    );
    expect(upcomingChestsSchema.parse({ items: [] }).items).toEqual([]);
  });
  it('normalizes tags without silently deleting invalid characters', () => {
    expect(clashTagSchema.parse(' #p0y9 ')).toBe('P0Y9');
    for (const tag of ['', '#', 'AB', 'P0/Y9', 'P0?Y9', 'P0#Y9', 'A'.repeat(21)])
      expect(clashTagSchema.safeParse(tag).success).toBe(false);
  });
  it('rejects executable remote URLs', () => {
    expect(
      runtimeConfigSchema.safeParse({ remotes: { portal: 'javascript:alert(1)' } }).success,
    ).toBe(false);
  });
  it('preserves compatibility fields and accepts members with zero points', () => {
    expect(
      tournamentSchema.parse({
        tag: '#P0Y',
        name: 'Cup',
        status: 'ended',
        membersList: [{ tag: '#Q0Y', name: 'Player', score: 0, rank: 10 }],
      }),
    ).toMatchObject({ status: 'ended', membersList: [{ score: 0, rank: 10 }] });
  });
});
