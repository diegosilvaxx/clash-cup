import { Link, Route, Routes } from 'react-router-dom';
import { Container } from '@clash-cup/ui';
import { Home } from './Home';
import { Contact, Privacy, Rules, Supporters } from './PublicPages';

export function App({ shellOrigin = '' }: { shellOrigin?: string }) {
  return (
    <Routes>
      <Route path="/" element={<Home shellOrigin={shellOrigin} />} />
      <Route path="/regras" element={<Rules />} />
      <Route path="/contato" element={<Contact />} />
      <Route path="/apoiadores" element={<Supporters />} />
      <Route path="/politicas" element={<Privacy />} />
      <Route
        path="/sobre"
        element={
          <Container>
            <h1>Sobre a Clash Cup</h1>
            <p>
              Uma comunidade de torneios online de Clash Royale para jogadores de diferentes níveis.
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
  );
}
