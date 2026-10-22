import { Navigate, Route, Routes } from 'react-router-dom';
import { Container, PageLayout } from '@clash-cup/ui';
import { App } from './App';
export function Standalone() {
  return (
    <PageLayout playerNavigation>
      <Routes>
        <Route path="/" element={<Navigate replace to="/area-vip" />} />
        {['/entrar', '/vincular-jogador'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <Container>
                <h1>Acesse sua conta pelo portal</h1>
                <p>
                  Para consultar seu perfil e seus próximos baús,{' '}
                  <a href={`http://127.0.0.1:5300${path}`}>continue no portal integrado</a>.
                </p>
              </Container>
            }
          />
        ))}
        <Route path="*" element={<App />} />
      </Routes>
    </PageLayout>
  );
}
