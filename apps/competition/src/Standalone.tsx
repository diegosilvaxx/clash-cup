import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLayout, Container } from '@clash-cup/ui';
import { App } from './App';
export function Standalone() {
  return (
    <PageLayout competitionNavigation>
      <Routes>
        <Route path="/" element={<Navigate replace to="/torneios" />} />
        <Route
          path="/entrar"
          element={
            <Container>
              <h1>Entre pelo portal</h1>
              <p>
                A aplicação de torneios independente usa uma sessão própria. Para entrar e
                participar, <a href="http://127.0.0.1:5300/entrar">acesse o portal integrado</a>.
              </p>
            </Container>
          }
        />
        <Route path="*" element={<App />} />
      </Routes>
    </PageLayout>
  );
}
