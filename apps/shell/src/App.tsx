import { Route, Routes, Link, Navigate } from 'react-router-dom';
import { AccountMenu, Container, PageLayout } from '@clash-cup/ui';
import { session, useSession } from '@clash-cup/session';
import { RemoteSlot } from './RemoteSlot';

export function App() {
  const state = useSession();
  return (
    <PageLayout
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
      <Routes>
        <Route path="/" element={<RemoteSlot key="portal" />} />
        {['/entrar', '/cadastro', '/vincular-jogador', '/minha-conta'].map((path) => (
          <Route key={path} path={path} element={<RemoteSlot key="auth" name="auth" />} />
        ))}
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
                Os torneios acontecem online, com oportunidades para jogadores de diferentes níveis.
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
    </PageLayout>
  );
}
