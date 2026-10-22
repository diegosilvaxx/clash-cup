import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Container, PageLayout } from '@clash-cup/ui';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<App />} />
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
          <Route
            path="*"
            element={
              <Container>
                <h1>Página não encontrada</h1>
                <Link to="/">Voltar ao início</Link>
              </Container>
            }
          />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  </StrictMode>,
);
