import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import { playerSchema, tournamentSchema, upcomingChestsSchema } from '@clash-cup/contracts';
import { ApiError } from './errors';

export interface ClashService {
  player(tag: string): Promise<unknown>;
  upcomingChests(tag: string): Promise<unknown>;
  tournament(tag: string): Promise<unknown>;
}

export function createClashService(
  token: string | undefined,
  client?: AxiosInstance,
): ClashService {
  const http =
    client ??
    axios.create({
      baseURL: 'https://api.clashroyale.com/v1',
      timeout: 10_000,
      maxRedirects: 0,
      headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    });
  async function request(path: string, schema: z.ZodType) {
    if (!token?.trim())
      throw new ApiError(
        503,
        'API_NOT_CONFIGURED',
        'A integração com Clash Royale ainda não foi configurada.',
      );
    try {
      const response = await http.get<unknown>(path);
      return schema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new ApiError(502, 'INVALID_UPSTREAM_RESPONSE', 'A API retornou dados inválidos.');
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
          throw new ApiError(504, 'UPSTREAM_TIMEOUT', 'A API demorou para responder.');
        if (error.response?.status === 404)
          throw new ApiError(404, 'NOT_FOUND', 'Jogador ou torneio não encontrado.');
        if (error.response?.status === 429)
          throw new ApiError(
            429,
            'RATE_LIMITED',
            'Limite de consultas atingido. Tente novamente mais tarde.',
          );
      }
      throw new ApiError(
        502,
        'UPSTREAM_UNAVAILABLE',
        'Não foi possível consultar a API do Clash Royale.',
      );
    }
  }
  return {
    player: (tag) => request(`/players/${encodeURIComponent(`#${tag}`)}`, playerSchema),
    upcomingChests: (tag) =>
      request(`/players/${encodeURIComponent(`#${tag}`)}/upcomingchests`, upcomingChestsSchema),
    tournament: (tag) => request(`/tournaments/${encodeURIComponent(`#${tag}`)}`, tournamentSchema),
  };
}
