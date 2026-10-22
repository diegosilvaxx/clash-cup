// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
vi.mock('@clash-cup/session', () => ({
  useSession: () => ({ status: 'anonymous', user: null, pending: false }),
  session: { signOut: vi.fn() },
}));
vi.mock('./RemoteSlot', () => ({
  RemoteSlot: ({ name }: { name: string }) => (
    <Routes>
      <Route path="/" element={<h1>Portal {name}</h1>} />
      <Route path="/entrar" element={<h1>Login {name}</h1>} />
      <Route path="/perfil" element={<h1>Perfil {name}</h1>} />
      <Route path="/baus" element={<h1>Baús {name}</h1>} />
      <Route path="/ranking" element={<h1>Ranking {name}</h1>} />
      <Route path="/loja" element={<h1>Loja {name}</h1>} />
      <Route path="/meus-emblemas" element={<h1>Emblemas {name}</h1>} />
      <Route path="/area-vip" element={<h1>VIP {name}</h1>} />
      <Route
        path="/torneios/:id"
        element={
          <>
            <h1>Detalhes {name}</h1>
            <Link to="/entrar">Abrir login</Link>
          </>
        }
      />
    </Routes>
  ),
}));
afterEach(cleanup);
describe('shell route composition', () => {
  it.each([
    ['/', 'Portal portal'],
    ['/entrar', 'Login auth'],
    ['/perfil', 'Perfil player'],
    ['/baus', 'Baús player'],
    ['/area-vip', 'VIP player'],
    ['/ranking', 'Ranking competition'],
    ['/loja', 'Loja player'],
    ['/meus-emblemas', 'Emblemas player'],
    ['/torneios/cup', 'Detalhes competition'],
  ])('provides the root route context to %s', (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });
  it('keeps unknown paths in the shell', () => {
    render(
      <MemoryRouter initialEntries={['/torneios/cup/unknown']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  });
});
