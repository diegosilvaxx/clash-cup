import { Navigate, Route, Routes } from 'react-router-dom';
import { Container, PageLayout } from '@clash-cup/ui';
import { App } from './App';
export function Standalone() {
  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<Navigate replace to="/admin" />} />
        <Route
          path="/entrar"
          element={
            <Container>
              <h1>Entre pelo portal</h1>
              <p>
                Para acessar o painel,{' '}
                <a href="http://127.0.0.1:5300/entrar">continue no portal integrado</a>.
              </p>
            </Container>
          }
        />
        <Route path="*" element={<App />} />
      </Routes>
    </PageLayout>
  );
}
