import { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createProfileRepository } from './profiles';
import type { SessionUser } from './types';

const user: SessionUser = {
  uid: 'user-a',
  email: 'player@example.test',
  emailVerified: true,
  displayName: 'Player',
};
const fields = {
  uid: { stringValue: user.uid },
  idUser: { stringValue: user.email! },
  idClashRoyale: { stringValue: '#P0Y' },
  nome: { stringValue: 'Player' },
};
function failure(status: number) {
  return new AxiosError('private details', undefined, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });
}
function fixture() {
  const get = vi.fn();
  const patch = vi.fn().mockResolvedValue({});
  const lookup = vi.fn().mockResolvedValue({ data: { tag: '#P0Y', name: 'Player' } });
  const repository = createProfileRepository(
    'demo-clash-cup',
    { get, patch } as unknown as AxiosInstance,
    { get: lookup } as unknown as AxiosInstance,
  );
  return { get, patch, lookup, repository };
}
describe('player profile repository', () => {
  it('reads a profile using the Firebase ID token and validates its owner', async () => {
    const { repository, get } = fixture();
    get.mockResolvedValue({ data: { fields } });
    expect(await repository.load({ user, token: 'test-token' })).toMatchObject({
      uid: user.uid,
      source: 'current',
    });
    expect(get).toHaveBeenCalledWith('/playerProfiles/user-a', {
      headers: { Authorization: 'Bearer test-token' },
    });
    get.mockResolvedValue({
      data: { fields: { ...fields, uid: { stringValue: 'another-user' } } },
    });
    await expect(repository.load({ user, token: 'test-token' })).rejects.toThrow('incompatíveis');
  });
  it('reuses a verified legacy profile without writing to either collection', async () => {
    const { repository, get, patch } = fixture();
    get.mockRejectedValueOnce(failure(404)).mockResolvedValueOnce({ data: { fields } });
    expect(await repository.load({ user, token: 'test-token' })).toMatchObject({
      source: 'legacy',
      idClashRoyale: '#P0Y',
    });
    expect(get.mock.calls[1]?.[0]).toBe('/users/player%40example.test');
    expect(patch).not.toHaveBeenCalled();
  });
  it('does not search legacy email records for an unverified user', async () => {
    const { repository, get } = fixture();
    get.mockRejectedValue(failure(404));
    expect(
      await repository.load({ user: { ...user, emailVerified: false }, token: 'test-token' }),
    ).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('does not interpret permission errors as an absent player profile', async () => {
    const { repository, get } = fixture();
    get.mockRejectedValue(failure(403));
    await expect(repository.load({ user, token: 'test-token' })).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('checks the player through the BFF before creating the current user profile', async () => {
    const { repository, lookup, patch } = fixture();
    expect(await repository.create({ user, token: 'test-token' }, ' #p0y ')).toMatchObject({
      uid: user.uid,
      idClashRoyale: '#P0Y',
    });
    expect(lookup).toHaveBeenCalledWith('/player', { params: { idclash: 'P0Y' } });
    expect(patch).toHaveBeenCalledWith(
      '/playerProfiles/user-a',
      { fields },
      {
        params: { 'currentDocument.exists': false },
        headers: { Authorization: 'Bearer test-token' },
      },
    );
  });
  it('does not write when the BFF returns a different or malformed player', async () => {
    const { repository, lookup, patch } = fixture();
    lookup
      .mockResolvedValueOnce({ data: { tag: '#Q0Y', name: 'Other' } })
      .mockResolvedValueOnce({ data: {} });
    await expect(repository.create({ user, token: 'test-token' }, 'P0Y')).rejects.toThrow(
      'diferente',
    );
    await expect(repository.create({ user, token: 'test-token' }, 'P0Y')).rejects.toThrow();
    expect(patch).not.toHaveBeenCalled();
  });
  it('never overwrites a profile created by a concurrent request', async () => {
    const { repository, patch } = fixture();
    patch.mockRejectedValue(failure(412));
    await expect(repository.create({ user, token: 'test-token' }, 'P0Y')).rejects.toMatchObject({
      code: 'profile-exists',
    });
    expect(patch).toHaveBeenCalledTimes(1);
  });
});
