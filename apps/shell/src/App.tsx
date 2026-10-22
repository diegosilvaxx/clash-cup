import { Route, Routes, Link } from 'react-router-dom';
import { Container, PageLayout } from '@clash-cup/ui';
import { RemoteSlot } from './RemoteSlot';

export function App() {
  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<RemoteSlot />} />
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
