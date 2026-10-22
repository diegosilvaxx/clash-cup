import { Navigate, Route, Routes } from 'react-router-dom';
import { Container, PageLayout, shellUrl } from '@clash-cup/ui';
import { App } from './App';
export function Standalone() {
  return (
    <PageLayout publicOrigin={shellUrl()}>
      <Routes>
        <Route path="/" element={<Navigate replace to="/admin" />} />
        <Route
          path="/entrar"
          element={
            <Container>
              <h1>Entre pelo portal</h1>
              <p>
                Para acessar o painel,{' '}
                <a href={shellUrl('/entrar')}>continue no portal integrado</a>.
              </p>
            </Container>
          }
        />
        <Route path="*" element={<App />} />
      </Routes>
    </PageLayout>
  );
}
