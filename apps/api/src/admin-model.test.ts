import { describe, expect, it } from 'vitest';
import { snapshotResults } from './admin-model';
const period = { tag: '#CUP', year: 2026, month: 10 };
const member = { tag: '#P0Y', name: 'Player', score: 0 };
const source = { tag: '#CUP', name: 'Cup', status: 'ended', membersList: [member] };
describe('official result snapshots', () => {
  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid score %s before any import is created',
    (score) => {
      expect(() =>
        snapshotResults({ ...source, membersList: [{ ...member, score }] }, period),
      ).toThrow('resultados válidos');
    },
  );
  it('rejects duplicate normalized tags and mismatched tournament responses', () => {
    expect(() =>
      snapshotResults({ ...source, membersList: [member, { ...member, tag: 'p0y' }] }, period),
    ).toThrow('duplicados');
    expect(() => snapshotResults({ ...source, tag: '#OTHER' }, period)).toThrow('não corresponde');
  });
  it('uses the same fingerprint regardless of participant order and keeps zero scores', () => {
    const other = { tag: '#AAA', name: 'Other', score: 3 };
    const first = snapshotResults({ ...source, membersList: [member, other] }, period);
    const second = snapshotResults({ ...source, membersList: [other, member] }, period);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.members.find((item) => item.tag === '#P0Y')?.score).toBe(0);
  });
});
