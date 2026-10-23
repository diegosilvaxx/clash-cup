// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
vi.mock('./useHighlights', () => ({
  useHighlights: () => ({
    tournaments: { status: 'ready', data: [] },
    ranking: { status: 'ready', data: null },
    leaders: [],
    retry: vi.fn(),
  }),
}));

afterEach(cleanup);
describe('public portal', () => {
  it.each([
    ['/regras', 'Regras e dúvidas'],
    ['/contato', 'Contato'],
    ['/apoiadores', 'Apoiadores'],
    ['/politicas', 'Dados e privacidade'],
  ])('opens public deep link %s without authentication', (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
  it('uses the confirmed contact destinations without a nonfunctional form', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/contato']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'contato@clashcup.com.br' })).toHaveAttribute(
      'href',
      'mailto:contato@clashcup.com.br',
    );
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://chat.whatsapp.com/IqS9d0CjV9NBbxsXZuSlCO',
    );
    expect(container.querySelector('form')).toBeNull();
  });
  it('shows only the three confirmed supporters with safe external destinations', () => {
    render(
      <MemoryRouter initialEntries={['/apoiadores']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article')).toHaveLength(3);
    for (const handle of ['bellezi_studio', 'jovemclash', 'crbrasil1']) {
      const link = screen.getByRole('link', { name: `@${handle} (nova aba)` });
      expect(link).toHaveAttribute('href', `https://www.instagram.com/${handle}/`);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
  it('keeps integrated calls to action local and standalone calls pointed to the host', () => {
    const { unmount } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Explorar torneios' })).toHaveAttribute(
      'href',
      '/torneios',
    );
    unmount();
    render(
      <MemoryRouter>
        <App shellOrigin="https://cup.example.test" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Explorar torneios' })).toHaveAttribute(
      'href',
      'https://cup.example.test/torneios',
    );
    expect(screen.getByRole('link', { name: 'Criar minha conta' })).toHaveAttribute(
      'href',
      'https://cup.example.test/cadastro',
    );
  });
});
