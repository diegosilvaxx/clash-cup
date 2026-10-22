import axios, { type AxiosInstance } from 'axios';
import { clashTagSchema, playerSchema, upcomingChestsSchema } from '@clash-cup/contracts';
import { createHttpClient } from '@clash-cup/http';

export class PlayerDataError extends Error {}
export function createPlayerClient(http: AxiosInstance = createHttpClient()) {
  return {
    async profile(tag: string, signal: AbortSignal) {
      const normalized = clashTagSchema.parse(tag);
      const response = await http.get<unknown>('/player', {
        params: { idclash: normalized },
        signal,
      });
      const player = playerSchema.parse(response.data);
      if (clashTagSchema.parse(player.tag) !== normalized)
        throw new PlayerDataError('A consulta retornou outro jogador. Tente novamente.');
      return player;
    },
    async chests(tag: string, signal: AbortSignal) {
      const response = await http.get<unknown>('/upcomingchests', {
        params: { idclash: clashTagSchema.parse(tag) },
        signal,
      });
      const result = upcomingChestsSchema.parse(response.data);
      return { ...result, items: [...result.items].sort((a, b) => a.index - b.index) };
    },
  };
}
export const playerClient = createPlayerClient();
export function playerError(error: unknown) {
  if (error instanceof PlayerDataError) return error.message;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404)
      return 'Jogador não encontrado. Confira o vínculo em Minha conta.';
    if (error.response?.status === 429)
      return 'Limite de consultas atingido. Aguarde um pouco e tente novamente.';
    if (error.response?.status === 503)
      return 'A consulta do Clash Royale está temporariamente indisponível. Tente novamente mais tarde.';
    if (error.response?.status === 504 || error.code === 'ECONNABORTED')
      return 'A consulta demorou para responder. Tente novamente.';
  }
  return 'Não foi possível carregar os dados do jogo. Confira sua conexão e tente novamente.';
}
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
