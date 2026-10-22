import { describe, expect, it } from 'vitest';
import {
  competitionError,
  parseCompetition,
  resolveLegacyRegistration,
  safeTournamentLink,
} from './model';
const data = { id: 'Mon Oct 12 2026', name: 'Copa', vacancies: '10', vacanciesAvailable: '9' };
describe('competition legacy adapter', () => {
  it('counts duplicate legacy ids even when one tournament has invalid fields', () => {
    const index = new Map([['Mon Oct 12 2026', ['valid', 'invalid']]]);
    const result = resolveLegacyRegistration(
      'old',
      { idTournament: data.id },
      [parseCompetition('valid', data)],
      index,
    );
    expect(result.tournamentId).toBeNull();
    expect(result.problem).toContain('mais de um');
  });
  it('uses the document id and interprets the legacy counter as occupied seats', () => {
    expect(parseCompetition('document-a', data)).toMatchObject({
      id: 'document-a',
      legacyId: data.id,
      occupied: 9,
      remaining: 1,
    });
  });
  it('rejects malformed or inconsistent counts instead of offering phantom seats', () => {
    for (const value of ['-1', '1.5', 'garbage', null, 11]) {
      expect(() => parseCompetition('id', { ...data, vacanciesAvailable: value })).toThrow();
    }
  });
  it('does not assign an ambiguous legacy registration to an arbitrary tournament', () => {
    const records = [parseCompetition('a', data), parseCompetition('b', data)];
    expect(resolveLegacyRegistration('old', { idTournament: data.id }, records)).toMatchObject({
      tournamentId: null,
      source: 'legacy',
    });
    expect(resolveLegacyRegistration('old', { idTournament: data.id }, records).problem).toContain(
      'mais de um',
    );
  });
  it('preserves orphaned registrations and resolves a unique legacy match', () => {
    expect(resolveLegacyRegistration('old', { idTournament: 'missing' }, []).problem).toContain(
      'não está disponível',
    );
    expect(
      resolveLegacyRegistration('old', { idTournament: data.id }, [parseCompetition('a', data)])
        .tournamentId,
    ).toBe('a');
  });
  it('rejects script urls, plain http and embedded credentials', () => {
    for (const value of [
      'javascript:alert(1)',
      'http://example.com',
      'https://user:password@example.com',
      '',
    ])
      expect(safeTournamentLink(value)).toBeNull();
    expect(safeTournamentLink('https://link.clashroyale.com/')).toBe(
      'https://link.clashroyale.com/',
    );
  });
  it('does not expose SDK diagnostics in messages', () => {
    expect(competitionError({ code: 'permission-denied', message: 'private payload' })).toContain(
      'permissões',
    );
    expect(competitionError(new Error('private payload'))).not.toContain('private');
  });
});
