import { Navigate, Route, Routes } from 'react-router-dom';
import { session, useSession } from '@clash-cup/session';
import { AccountMenu, Container, PageLayout } from '@clash-cup/ui';
import { App } from './App';

export function Standalone() {
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
        <Route path="/" element={<Navigate replace to="/entrar" />} />
        <Route
          path="/sobre"
          element={
            <Container>
              <h1>Sobre a Clash Cup</h1>
              <p>
                Uma comunidade de torneios online de Clash Royale para jogadores de diferentes
                níveis.
              </p>
            </Container>
          }
        />
        <Route path="*" element={<App />} />
      </Routes>
    </PageLayout>
  );
}
