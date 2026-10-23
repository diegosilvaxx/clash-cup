import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import { playerSchema, tournamentSchema, upcomingChestsSchema } from '@clash-cup/contracts';
import { ApiError } from './errors';

export interface ClashService {
  player(tag: string, signal?: AbortSignal): Promise<unknown>;
  upcomingChests(tag: string, signal?: AbortSignal): Promise<unknown>;
  tournament(tag: string, signal?: AbortSignal): Promise<unknown>;
}

function upstreamFailure(error: unknown): ApiError {
  if (error instanceof z.ZodError)
    return new ApiError(502, 'INVALID_UPSTREAM_RESPONSE', 'A API retornou dados inválidos.');
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return new ApiError(504, 'UPSTREAM_TIMEOUT', 'A API demorou para responder.');
    if (status === 401)
      return new ApiError(
        502,
        'UPSTREAM_AUTH_FAILED',
        'A API do Clash Royale recusou a credencial do servidor.',
      );
    if (status === 403) {
      const data: unknown = error.response?.data;
      if (
        data &&
        typeof data === 'object' &&
        'reason' in data &&
        data.reason === 'accessDenied.invalidIp'
      )
        return new ApiError(
          502,
          'UPSTREAM_IP_NOT_ALLOWED',
          'A API do Clash Royale não autorizou o IP de saída do servidor.',
        );
      return new ApiError(
        502,
        'UPSTREAM_ACCESS_DENIED',
        'A API do Clash Royale negou o acesso do servidor a esta consulta.',
      );
    }
    if (status === 404) return new ApiError(404, 'NOT_FOUND', 'Jogador ou torneio não encontrado.');
    if (status === 429)
      return new ApiError(
        429,
        'RATE_LIMITED',
        'Limite de consultas atingido. Tente novamente mais tarde.',
      );
    if (
      status === undefined &&
      ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ERR_NETWORK'].includes(
        error.code ?? '',
      )
    )
      return new ApiError(
        502,
        'UPSTREAM_CONNECTION_FAILED',
        'O servidor não conseguiu estabelecer conexão com a API do Clash Royale.',
      );
  }
  return new ApiError(
    502,
    'UPSTREAM_UNAVAILABLE',
    'Não foi possível consultar a API do Clash Royale.',
  );
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
  async function request(path: string, schema: z.ZodType, signal?: AbortSignal) {
    if (!token?.trim())
      throw new ApiError(
        503,
        'API_NOT_CONFIGURED',
        'A integração com Clash Royale ainda não foi configurada.',
      );
    try {
      const response = signal
        ? await http.get<unknown>(path, { signal })
        : await http.get<unknown>(path);
      return schema.parse(response.data);
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      const failure = upstreamFailure(error);
      // Never log the Axios error: it contains request headers and the API token.
      console.error('Clash Royale request failed', {
        code: failure.code,
        upstreamStatus: axios.isAxiosError(error) ? (error.response?.status ?? null) : null,
      });
      throw failure;
    }
  }
  return {
    player: (tag, signal) =>
      request(`/players/${encodeURIComponent(`#${tag}`)}`, playerSchema, signal),
    upcomingChests: (tag, signal) =>
      request(
        `/players/${encodeURIComponent(`#${tag}`)}/upcomingchests`,
        upcomingChestsSchema,
        signal,
      ),
    tournament: (tag, signal) =>
      request(`/tournaments/${encodeURIComponent(`#${tag}`)}`, tournamentSchema, signal),
  };
}
