import { useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { session, useSession, type SessionSnapshot } from '@clash-cup/session';
import {
  competitions,
  competitionError,
  type Competition,
  type Registration,
} from '@clash-cup/competitions';
import { Container, TournamentTile } from '@clash-cup/ui';
import { Ranking } from './Ranking';
import { useCompetitionData } from './useCompetitionData';
import { Actions, Button, Card, Feedback, Grid, Navigation } from './styles';

function TournamentCard({ item }: { item: Competition }) {
  return (
    <TournamentTile
      headingLevel="h2"
      name={item.name}
      description={item.description}
      date={item.date}
      occupied={item.occupied}
      capacity={item.capacity}
      open={item.open}
      to={`/torneios/${encodeURIComponent(item.id)}`}
    />
  );
}
type DetailProps = {
  items: Competition[];
  registrations: Registration[];
  state: SessionSnapshot;
  registrationError: string | null;
  refresh: () => void;
  refreshing: boolean;
};
function Details({
  items,
  registrations,
  state,
  registrationError,
  refresh,
  refreshing,
}: DetailProps) {
  const { id } = useParams();
  const item = items.find((tournament) => tournament.id === id);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const busy = useRef(false);
  if (!item)
    return (
      <>
        <h1>Torneio não encontrado</h1>
        <p>O torneio pode ter sido removido ou precisa de revisão.</p>
        <Link to="/torneios">Ver torneios</Link>
      </>
    );
  const registration = registrations.find((entry) => entry.tournamentId === item.id);
  const legacy = registrations.find(
    (entry) => entry.source === 'legacy' && entry.legacyId && entry.legacyId === item.legacyId,
  );
  async function act(kind: 'join' | 'cancel') {
    if (busy.current || !state.user || !item) return;
    busy.current = true;
    setPending(true);
    setMessage(null);
    const uid = state.user.uid;
    try {
      if (kind === 'join') {
        if (!state.profile) return;
        await competitions.join(state.user, state.profile, item.id, items);
      } else await competitions.cancel(state.user, item.id);
      if (session.getSnapshot().user?.uid !== uid) return;
      setMessage({
        error: false,
        text: kind === 'join' ? 'Inscrição confirmada.' : 'Inscrição cancelada.',
      });
      refresh();
    } catch (error) {
      if (session.getSnapshot().user?.uid === uid)
        setMessage({ error: true, text: competitionError(error) });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const authenticated = state.status === 'authenticated';
  return (
    <>
      <Link to="/torneios">← Todos os torneios</Link>
      <Card>
        <h1>{item.name}</h1>
        <p>{item.date || 'Data a confirmar'}</p>
        <p>{item.description || 'A organização ainda não informou os detalhes.'}</p>
        <p>
          {item.occupied} de {item.capacity} vagas ocupadas · {item.remaining} disponíveis
        </p>
        {!item.open && <p>Inscrições encerradas</p>}
        {item.link && (
          <p>
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              Abrir torneio no Clash Royale (nova aba)
            </a>
          </p>
        )}
        {message && <Feedback role={message.error ? 'alert' : 'status'}>{message.text}</Feedback>}
        {state.status === 'initializing' ? (
          <p role="status">Carregando sua conta…</p>
        ) : !authenticated ? (
          <p>
            <Link to="/entrar">Entre na sua conta</Link> para participar.
          </p>
        ) : state.profileStatus === 'error' ? (
          <>
            <Feedback role="alert">{state.profileError}</Feedback>
            <Button onClick={() => void session.retryProfile()}>Recarregar jogador</Button>
          </>
        ) : state.profileStatus !== 'ready' ? (
          <p role="status">Carregando jogador…</p>
        ) : registrationError ? (
          <Feedback role="alert">{registrationError}</Feedback>
        ) : registration?.source === 'current' ? (
          <Actions>
            <span>Você está inscrito.</span>
            <Button disabled={pending || refreshing} onClick={() => void act('cancel')}>
              {pending ? 'Aguarde…' : 'Cancelar inscrição'}
            </Button>
          </Actions>
        ) : legacy ? (
          <Feedback>
            Você possui uma inscrição antiga. Para alterações, entre em contato com a organização.
            {legacy.problem && ` ${legacy.problem}`}
          </Feedback>
        ) : !state.profile ? (
          <p>
            <Link to="/vincular-jogador">Vincule seu jogador</Link> para participar.
          </p>
        ) : (
          <Actions>
            <Button
              disabled={
                pending || refreshing || state.pending || !item.open || item.remaining === 0
              }
              onClick={() => void act('join')}
            >
              {pending ? 'Aguarde…' : item.remaining === 0 ? 'Vagas esgotadas' : 'Inscrever-se'}
            </Button>
          </Actions>
        )}
      </Card>
    </>
  );
}
function MyTournaments({ items, registrations, state, registrationError }: DetailProps) {
  if (state.status === 'initializing') return <p role="status">Carregando sua conta…</p>;
  if (state.status !== 'authenticated') return <Navigate replace to="/entrar" />;
  return (
    <>
      <h1>Meus torneios</h1>
      {!state.user?.emailVerified && (
        <p>As inscrições antigas só podem ser consultadas com o email confirmado.</p>
      )}
      {registrationError ? (
        <Feedback role="alert">{registrationError}</Feedback>
      ) : registrations.length === 0 ? (
        <p>
          Você ainda não possui inscrições. <Link to="/torneios">Conheça os torneios</Link>.
        </p>
      ) : (
        <Grid>
          {registrations.map((entry) => {
            const item = items.find((tournament) => tournament.id === entry.tournamentId);
            return (
              <Card key={`${entry.source}:${entry.id}`}>
                <h2>
                  {item ? (
                    <Link to={`/torneios/${encodeURIComponent(item.id)}`}>{item.name}</Link>
                  ) : (
                    'Inscrição sem torneio identificado'
                  )}
                </h2>
                <p>{entry.source === 'legacy' ? 'Inscrição antiga' : 'Inscrição confirmada'}</p>
                {entry.problem && <p>{entry.problem}</p>}
                {entry.source === 'legacy' && (
                  <p>Alterações nesta inscrição devem ser solicitadas à organização.</p>
                )}
              </Card>
            );
          })}
        </Grid>
      )}
    </>
  );
}
function CompetitionContent() {
  const state = useSession();
  const location = useLocation();
  const [revision, setRevision] = useState(0);
  const result = useCompetitionData(state.user, revision);
  const refresh = () => setRevision((value) => value + 1);
  return (
    <Container>
      <Navigation aria-label="Competições">
        <Link to="/torneios">Todos os torneios</Link>
        <Link to="/meus-torneios">Minhas inscrições</Link>
      </Navigation>
      {result.loading && !result.data ? (
        <p role="status">Carregando torneios…</p>
      ) : result.error ? (
        <>
          <h1>Torneios indisponíveis</h1>
          <Feedback role="alert">{result.error}</Feedback>
          <Button onClick={refresh}>Tentar novamente</Button>
        </>
      ) : (
        result.data && (
          <>
            {result.loading && <p role="status">Atualizando torneios…</p>}
            {result.data.invalid > 0 && (
              <Feedback role="status">
                {result.data.invalid} torneio(s) com dados incompletos aguardam revisão da
                organização.
              </Feedback>
            )}
            <Actions>
              <Button disabled={result.loading} onClick={refresh}>
                Atualizar torneios
              </Button>
            </Actions>
            <Routes>
              <Route
                path="/torneios"
                element={
                  <>
                    <h1>Torneios</h1>
                    {result.data.items.length === 0 ? (
                      <p>Nenhum torneio disponível no momento.</p>
                    ) : (
                      <Grid>
                        {result.data.items.map((item) => (
                          <TournamentCard key={item.id} item={item} />
                        ))}
                      </Grid>
                    )}
                  </>
                }
              />
              <Route
                path="/torneios/:id"
                element={
                  <Details
                    key={`${state.user?.uid ?? 'anonymous'}:${location.pathname}`}
                    items={result.data.items}
                    registrations={result.data.registrations}
                    state={state}
                    registrationError={result.registrationError}
                    refreshing={result.loading}
                    refresh={refresh}
                  />
                }
              />
              <Route
                path="/meus-torneios"
                element={
                  <MyTournaments
                    items={result.data.items}
                    registrations={result.data.registrations}
                    state={state}
                    registrationError={result.registrationError}
                    refreshing={result.loading}
                    refresh={refresh}
                  />
                }
              />
              <Route path="*" element={<Navigate replace to="/torneios" />} />
            </Routes>
          </>
        )
      )}
    </Container>
  );
}
export function App() {
  const { pathname } = useLocation();
  return pathname === '/ranking' ? <Ranking /> : <CompetitionContent />;
}
