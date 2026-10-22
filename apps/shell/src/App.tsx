import { Route, Routes, Link, Navigate, matchPath, useLocation } from 'react-router-dom';
import { AccountMenu, Container, PageLayout } from '@clash-cup/ui';
import { session, useSession } from '@clash-cup/session';
import { RemoteSlot } from './RemoteSlot';

export function App() {
  const state = useSession();
  const { pathname } = useLocation();
  const remotes = [
    { name: 'portal', paths: ['/'] },
    { name: 'auth', paths: ['/entrar', '/cadastro', '/vincular-jogador', '/minha-conta'] },
    { name: 'competition', paths: ['/torneios', '/torneios/:id', '/meus-torneios', '/ranking'] },
    { name: 'player', paths: ['/perfil', '/baus', '/area-vip', '/loja', '/meus-emblemas'] },
  ] as const;
  const remote = remotes.find(({ paths }) => paths.some((path) => matchPath(path, pathname)))?.name;
  return (
    <PageLayout
      competitionNavigation
      playerNavigation
      accountMenu={
        <AccountMenu
          key={state.user?.uid ?? 'anonymous'}
          authenticated={state.status === 'authenticated'}
          initializing={state.status === 'initializing'}
          pending={state.pending}
          onSignOut={session.signOut}
        />
      }
    >
      {remote ? (
        <RemoteSlot key={remote} name={remote} />
      ) : (
        <Routes>
          <Route path="/torneio" element={<Navigate replace to="/torneios" />} />
          <Route path="/signup" element={<Navigate replace to="/cadastro" />} />
          <Route
            path="/registerIdClashRoyale"
            element={<Navigate replace to="/vincular-jogador" />}
          />
          <Route path="/dashboard" element={<Navigate replace to="/minha-conta" />} />
          <Route
            path="/sobre"
            element={
              <Container>
                <h1>Sobre a Clash Cup</h1>
                <p>
                  Nossa comunidade reúne jogadores de Clash Royale para competir, desenvolver suas
                  habilidades e compartilhar experiências.
                </p>
                <p>
                  Os torneios acontecem online, com oportunidades para jogadores de diferentes
                  níveis.
                </p>
              </Container>
            }
          />
          <Route
            path="*"
            element={
              <Container>
                <h1>Página não encontrada</h1>
                <p>O endereço informado não está disponível.</p>
                <Link to="/">Voltar ao início</Link>
              </Container>
            }
          />
        </Routes>
      )}
    </PageLayout>
  );
}
