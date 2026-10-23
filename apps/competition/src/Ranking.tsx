import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import {
  findEmblem,
  rewards,
  rewardError,
  selectRanking,
  type RankingData,
  type RankingFilter,
} from '@clash-cup/rewards';
import { Container } from '@clash-cup/ui';
import { Actions, Button, Feedback, Navigation } from './styles';

const TableFrame = styled.div`
  overflow-x: auto;
  border: 1px solid var(--cup-border);
  border-radius: 12px;
  background: var(--cup-panel);
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  th,
  td {
    padding: 16px;
    border-bottom: 1px solid var(--cup-border);
  }
  caption {
    padding: 16px;
    text-align: left;
    font-weight: 650;
  }
  img {
    object-fit: contain;
    vertical-align: middle;
  }
  small {
    display: block;
    color: var(--cup-muted);
    margin-top: 6px;
  }
`;
const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 24px 0;
  label {
    display: grid;
    gap: 8px;
  }
  select {
    min-height: 44px;
    max-width: 100%;
    padding: 8px 12px;
    border: 1px solid #476185;
    border-radius: 8px;
    background: var(--cup-panel);
    color: inherit;
  }
`;
export function Ranking() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    data: RankingData | null;
    error: string | null;
  } | null>(null);
  const [filter, setFilter] = useState<RankingFilter>({ mode: 'current', period: '' });
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    void rewards.ranking().then(
      (data) => {
        if (active) setResult({ revision, data, error: null });
      },
      (error) => {
        if (active) setResult({ revision, data: null, error: rewardError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [revision]);
  const loading = result?.revision !== revision;
  const data = loading ? null : result?.data;
  const years = data
    ? [...new Set(data.history.map((row) => String(row.year)))].sort().reverse()
    : [];
  const months = data
    ? [...new Set(data.history.map((row) => `${row.year}-${String(row.month).padStart(2, '0')}`))]
        .sort()
        .reverse()
    : [];
  const periods = filter.mode === 'year' ? years : months;
  const period = periods.includes(filter.period) ? filter.period : (periods[0] ?? '');
  let calculationError: string | null = null;
  let rows: ReturnType<typeof selectRanking> = [];
  try {
    if (data) rows = selectRanking(data, { ...filter, period });
  } catch (error) {
    calculationError = rewardError(error);
  }
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(page, pages);
  return (
    <Container>
      <Navigation aria-label="Competições">
        <NavLink to="/torneios">Torneios</NavLink>
        <NavLink to="/meus-torneios">Meus torneios</NavLink>
        <NavLink to="/ranking">Ranking</NavLink>
      </Navigation>
      <h1>Ranking da comunidade</h1>
      <p>Acompanhe a pontuação dos torneios e consulte os resultados históricos.</p>
      {loading ? (
        <p role="status">Carregando ranking…</p>
      ) : result?.error ? (
        <>
          <Feedback role="alert">{result.error}</Feedback>
          <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
        </>
      ) : (
        data && (
          <>
            <Filters>
              <label>
                Classificação
                <select
                  value={filter.mode}
                  onChange={(event) => {
                    setFilter({ mode: event.target.value as RankingFilter['mode'], period: '' });
                    setPage(1);
                  }}
                >
                  <option value="current">Atual</option>
                  <option value="year">Anual</option>
                  <option value="month">Histórico mensal</option>
                </select>
              </label>
              {filter.mode !== 'current' && (
                <label>
                  Período
                  <select
                    value={period}
                    disabled={periods.length === 0}
                    onChange={(event) => {
                      setFilter({ ...filter, period: event.target.value });
                      setPage(1);
                    }}
                  >
                    {periods.length === 0 && <option value="">Sem histórico</option>}
                    {periods.map((value) => (
                      <option key={value} value={value}>
                        {filter.mode === 'year' ? value : `${value.slice(5)}/${value.slice(0, 4)}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </Filters>
            {filter.mode === 'current' && (
              <p>A classificação atual segue os registros publicados pela organização.</p>
            )}
            {data.invalid > 0 && (
              <Feedback role="status">
                {data.invalid} registro(s) incompleto(s) ou duplicado(s) aguardam revisão e não
                entram na classificação.
              </Feedback>
            )}
            {data.badgesUnavailable && (
              <Feedback role="status">
                Os emblemas estão temporariamente indisponíveis. A pontuação continua disponível.
              </Feedback>
            )}
            <Actions>
              <Button onClick={() => setRevision((value) => value + 1)}>Atualizar ranking</Button>
            </Actions>
            {calculationError ? (
              <Feedback role="alert">{calculationError}</Feedback>
            ) : rows.length === 0 ? (
              <p>Nenhum resultado disponível para esta classificação.</p>
            ) : (
              <>
                <TableFrame role="region" aria-label="Tabela de classificação" tabIndex={0}>
                  <table>
                    <caption>
                      {filter.mode === 'current'
                        ? 'Classificação atual'
                        : filter.mode === 'year'
                          ? `Pontuação de ${period}`
                          : `Pontuação de ${period.slice(5)}/${period.slice(0, 4)}`}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Posição</th>
                        <th scope="col">Jogador</th>
                        <th scope="col">Clã</th>
                        <th scope="col">Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice((currentPage - 1) * 25, currentPage * 25).map((row) => {
                        const position = rows.findIndex((item) => item.score === row.score) + 1;
                        const emblem = findEmblem(data.badges[row.tag] ?? '');
                        return (
                          <tr key={row.tag}>
                            <td>{position}º</td>
                            <th scope="row">
                              {emblem && (
                                <img
                                  src={emblem.image}
                                  width="36"
                                  height="36"
                                  alt={emblem.name}
                                  loading="lazy"
                                />
                              )}{' '}
                              {row.name}
                              <small>{row.tag}</small>
                            </th>
                            <td>{row.clan || 'Sem clã'}</td>
                            <td>{row.score.toLocaleString('pt-BR')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableFrame>
                {pages > 1 && (
                  <Actions aria-label="Paginação do ranking">
                    <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      Anterior
                    </Button>
                    <span role="status">
                      Página {currentPage} de {pages}
                    </span>
                    <Button
                      disabled={currentPage === pages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Próxima
                    </Button>
                  </Actions>
                )}
              </>
            )}
          </>
        )
      )}
    </Container>
  );
}
