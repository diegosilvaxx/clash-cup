// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { PageLayout } from './index';

afterEach(cleanup);

describe('accessible layout navigation', () => {
  it('preserves initial keyboard access and focuses main only on route changes', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PageLayout>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <h1>Início da comunidade</h1>
                  <Link to="/contato">Abrir contato</Link>
                </>
              }
            />
            <Route
              path="/contato"
              element={
                <>
                  <h1>Contato</h1>
                  <input aria-label="Mensagem" />
                </>
              }
            />
          </Routes>
        </PageLayout>
      </MemoryRouter>,
    );
    await user.tab();
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveFocus();
    expect(document.title).toBe('Início da comunidade | Clash Cup Brasil');
    await user.click(screen.getByRole('link', { name: 'Abrir contato' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(document.title).toBe('Contato | Clash Cup Brasil');
    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Olá');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(
      within(screen.getByRole('navigation', { name: 'Informações da comunidade' })).getByRole(
        'link',
        { name: 'Contato' },
      ),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('updates the title when asynchronous remote content arrives without stealing focus', async () => {
    function DeferredPage() {
      const [loaded, setLoaded] = useState(false);
      return (
        <>
          <button onClick={() => setLoaded(true)}>Carregar conteúdo</button>
          {loaded && <h1>Resultados publicados</h1>}
        </>
      );
    }
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PageLayout>
          <DeferredPage />
        </PageLayout>
      </MemoryRouter>,
    );
    expect(document.title).toBe('Clash Cup Brasil');
    const button = screen.getByRole('button', { name: 'Carregar conteúdo' });
    await user.click(button);
    await waitFor(() => expect(document.title).toBe('Resultados publicados | Clash Cup Brasil'));
    expect(button).toHaveFocus();
  });

  it('routes public links from an independent application to the integrated portal', () => {
    render(
      <MemoryRouter>
        <PageLayout publicOrigin="https://cup.example.test">
          <h1>Área independente</h1>
        </PageLayout>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Clash Cup — início' })).toHaveAttribute(
      'href',
      'https://cup.example.test',
    );
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'href',
      'https://cup.example.test/',
    );
    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute(
      'href',
      'https://cup.example.test/contato',
    );
  });
});
