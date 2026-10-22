import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import { clashTagSchema, playerSchema } from '@clash-cup/contracts';
import { createHttpClient } from '@clash-cup/http';
import { SessionError } from './errors';
import type { PlayerProfile, SessionUser } from './types';

const stringField = z.object({ stringValue: z.string() });
const legacyFields = z.object({
  idUser: stringField,
  idClashRoyale: stringField,
  nome: stringField,
});
const currentFields = legacyFields.extend({ uid: stringField });
interface Credentials {
  user: SessionUser;
  token: string;
}

export function createProfileRepository(
  projectId: string,
  firestore = createHttpClient(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`,
  ),
  api: AxiosInstance = createHttpClient(),
) {
  async function read(path: string, token: string) {
    try {
      return (
        await firestore.get<{ fields: unknown }>(path, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  }
  function parseProfile(fields: unknown, user: SessionUser, legacy = false): PlayerProfile {
    const data = (legacy ? legacyFields : currentFields).parse(fields);
    if (!legacy && currentFields.parse(fields).uid.stringValue !== user.uid)
      throw new SessionError(
        'invalid-profile',
        'O vínculo do jogador retornou dados incompatíveis.',
      );
    if (legacy && (!user.emailVerified || data.idUser.stringValue !== user.email))
      throw new SessionError('invalid-profile', 'Não foi possível confirmar a conta do jogador.');
    return {
      uid: user.uid,
      idUser: data.idUser.stringValue,
      idClashRoyale: `#${clashTagSchema.parse(data.idClashRoyale.stringValue)}`,
      nome: data.nome.stringValue,
      source: legacy ? 'legacy' : 'current',
    };
  }
  return {
    async load({ user, token }: Credentials): Promise<PlayerProfile | null> {
      const current = await read(`/playerProfiles/${encodeURIComponent(user.uid)}`, token);
      if (current) return parseProfile(current.fields, user);
      if (!user.email || !user.emailVerified) return null;
      const legacy = await read(`/users/${encodeURIComponent(user.email)}`, token);
      return legacy ? parseProfile(legacy.fields, user, true) : null;
    },
    async create({ user, token }: Credentials, input: string): Promise<PlayerProfile> {
      const tag = clashTagSchema.parse(input);
      const result = await api.get<unknown>('/player', { params: { idclash: tag } });
      const player = playerSchema.parse(result.data);
      if (clashTagSchema.parse(player.tag) !== tag)
        throw new SessionError(
          'invalid-player',
          'A API retornou um jogador diferente da tag informada.',
        );
      const fields = {
        uid: { stringValue: user.uid },
        idUser: { stringValue: user.email ?? '' },
        idClashRoyale: { stringValue: `#${tag}` },
        nome: { stringValue: player.name },
      };
      try {
        await firestore.patch(
          `/playerProfiles/${encodeURIComponent(user.uid)}`,
          { fields },
          {
            params: { 'currentDocument.exists': false },
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } catch (error) {
        if (axios.isAxiosError(error) && [409, 412].includes(error.response?.status ?? 0))
          throw new SessionError(
            'profile-exists',
            'Sua conta já possui um jogador vinculado. Atualize os dados da conta.',
          );
        throw error;
      }
      return parseProfile(fields, user);
    },
  };
}
