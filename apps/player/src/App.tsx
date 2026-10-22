import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { session, useSession, type PlayerProfile } from '@clash-cup/session';
import { Container } from '@clash-cup/ui';
import { Chests } from './Chests';
import { Profile } from './Profile';
import { Shop } from './Shop';
import { Vip } from './Vip';
import { Button, Navigation, Panel } from './styles';

function LinkedPlayer({ children }: { children: (profile: PlayerProfile) => ReactNode }) {
  const state = useSession();
  if (state.status === 'initializing') return <p role="status">Carregando sua conta…</p>;
  if (state.status === 'error' || state.status === 'unconfigured')
    return (
      <Panel role="alert">
        <h1>Conta indisponível</h1>
        <p>{state.error}</p>
        {state.status === 'error' && (
          <Button onClick={() => void session.start()}>Tentar novamente</Button>
        )}
      </Panel>
    );
  if (state.status !== 'authenticated') return <Navigate replace to="/entrar" />;
  if (state.profileStatus === 'error')
    return (
      <Panel role="alert">
        <h1>Não foi possível carregar seu jogador.</h1>
        <p>{state.profileError}</p>
        <Button onClick={() => void session.retryProfile()}>Tentar novamente</Button>
      </Panel>
    );
  if (state.profileStatus !== 'ready') return <p role="status">Carregando jogador…</p>;
  if (!state.profile) return <Navigate replace to="/vincular-jogador" />;
  return children(state.profile);
}
export function App() {
  return (
    <Container>
      <Navigation aria-label="Área do jogador">
        <NavLink to="/perfil">Perfil</NavLink>
        <NavLink to="/baus">Baús</NavLink>
        <NavLink to="/loja">Loja</NavLink>
        <NavLink to="/meus-emblemas">Meus emblemas</NavLink>
        <NavLink to="/area-vip">Área VIP</NavLink>
      </Navigation>
      <Routes>
        <Route
          path="/perfil"
          element={
            <LinkedPlayer>
              {(profile) => (
                <Profile key={`${profile.uid}:${profile.idClashRoyale}`} profile={profile} />
              )}
            </LinkedPlayer>
          }
        />
        <Route
          path="/baus"
          element={
            <LinkedPlayer>
              {(profile) => (
                <Chests key={`${profile.uid}:${profile.idClashRoyale}`} profile={profile} />
              )}
            </LinkedPlayer>
          }
        />
        {['/loja', '/meus-emblemas'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <LinkedPlayer>
                {(profile) => (
                  <Shop key={`${profile.uid}:${profile.idClashRoyale}`} profile={profile} />
                )}
              </LinkedPlayer>
            }
          />
        ))}
        <Route path="/area-vip" element={<Vip />} />
        <Route path="*" element={<Navigate replace to="/perfil" />} />
      </Routes>
    </Container>
  );
}
