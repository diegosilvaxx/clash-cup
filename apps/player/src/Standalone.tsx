import { Navigate, Route, Routes } from 'react-router-dom';
import { Container, PageLayout, shellUrl } from '@clash-cup/ui';
import { App } from './App';
export function Standalone() {
  return (
    <PageLayout publicOrigin={shellUrl()} playerNavigation>
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
                  Para consultar seu perfil, seus baús e seus emblemas,{' '}
                  <a href={shellUrl(path)}>continue no portal integrado</a>.
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
