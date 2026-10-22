import { Navigate, Route, Routes } from 'react-router-dom';
import { session, useSession } from '@clash-cup/session';
import { Container, Notice } from '@clash-cup/ui';
import { CredentialsForm } from './CredentialsForm';
import { LinkPlayerForm } from './LinkPlayerForm';
import { Card, DefinitionList } from './styles';

export function App() {
  const state = useSession();
  if (state.status === 'initializing')
    return (
      <Container>
        <p role="status">Carregando sua conta…</p>
      </Container>
    );
  if (state.status === 'unconfigured' || state.status === 'error')
    return (
      <Container>
        <Notice role="alert">
          <h1>Login indisponível</h1>
          <p>{state.error}</p>
          {state.status === 'error' && (
            <button onClick={() => void session.start()}>Tentar novamente</button>
          )}
        </Notice>
      </Container>
    );
  const authenticated = state.status === 'authenticated';
  if (authenticated && (state.profileStatus === 'loading' || state.profileStatus === 'idle'))
    return (
      <Container>
        <p role="status">Carregando sua conta…</p>
      </Container>
    );
  if (authenticated && state.profileStatus === 'error')
    return (
      <Container>
        <Notice role="alert">
          <h1>Não foi possível carregar seu jogador.</h1>
          <p>{state.profileError}</p>
          <button onClick={() => void session.retryProfile()}>Tentar novamente</button>
        </Notice>
      </Container>
    );
  const destination = state.profile ? '/minha-conta' : '/vincular-jogador';
  return (
    <Container>
      <Routes>
        <Route
          path="/entrar"
          element={
            authenticated ? (
              <Navigate replace to={destination} />
            ) : (
              <CredentialsForm key="signin" mode="signin" />
            )
          }
        />
        <Route
          path="/cadastro"
          element={
            authenticated ? (
              <Navigate replace to={destination} />
            ) : (
              <CredentialsForm key="signup" mode="signup" />
            )
          }
        />
        <Route
          path="/vincular-jogador"
          element={
            !authenticated ? (
              <Navigate replace to="/entrar" />
            ) : state.profile ? (
              <Navigate replace to="/minha-conta" />
            ) : (
              <LinkPlayerForm />
            )
          }
        />
        <Route
          path="/minha-conta"
          element={
            !authenticated ? (
              <Navigate replace to="/entrar" />
            ) : !state.profile ? (
              <Navigate replace to="/vincular-jogador" />
            ) : (
              <Card>
                <h1>Minha conta</h1>
                <DefinitionList>
                  <dt>Jogador</dt>
                  <dd>{state.profile.nome}</dd>
                  <dt>Tag do Clash Royale</dt>
                  <dd>{state.profile.idClashRoyale}</dd>
                  <dt>Email</dt>
                  <dd>{state.user?.email ?? 'Não informado'}</dd>
                </DefinitionList>
              </Card>
            )
          }
        />
        <Route path="*" element={<Navigate replace to="/entrar" />} />
      </Routes>
    </Container>
  );
}
