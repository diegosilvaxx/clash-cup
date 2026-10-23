// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@clash-cup/session';
import { emptyChampionship, type Championship } from '@clash-cup/competitions';
import { Championships } from './Championships';
const mock = vi.hoisted(() => ({
  state: {} as SessionSnapshot,
  list: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
}));
vi.mock('@clash-cup/session', () => ({ useSession: () => mock.state }));
vi.mock('@clash-cup/competitions', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  championships: mock,
}));
const item = (): Championship => ({
  ...emptyChampionship(),
  name: 'Copa dos Reis',
  id: 'cup',
  ownerUid: 'owner',
  revision: 1,
  status: 'published',
  players: ['Lucas', 'Diego', 'Ana', 'Pedro', 'Carla', 'Bruno', 'Sofia', 'Rafael'],
});
function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Championships />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mock.state = {
    status: 'authenticated',
    user: { uid: 'owner', email: null, displayName: null, emailVerified: false },
    profile: null,
    profileStatus: 'ready',
    profileError: null,
    pending: false,
    error: null,
  };
  mock.list.mockResolvedValue([]);
  mock.get.mockResolvedValue(item());
  mock.save.mockReset();
});
afterEach(cleanup);
describe('championship screens', () => {
  it('requires a session for creation without requiring a linked Clash account', () => {
    mock.state = { ...mock.state, status: 'anonymous', user: null };
    renderRoute('/campeonatos/novo');
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toBeVisible();
    expect(screen.queryByLabelText('Nome do campeonato')).not.toBeInTheDocument();
  });
  it('rejects incomplete publication and retains the entered name', async () => {
    renderRoute('/campeonatos/novo');
    fireEvent.change(screen.getByLabelText('Nome do campeonato'), {
      target: { value: 'Minha Copa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar e gerar chaveamento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('todos os jogadores');
    expect(mock.save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome do campeonato')).toHaveValue('Minha Copa');
  });
  it('imports players and saves an incomplete private draft', async () => {
    mock.save.mockRejectedValue(new Error('Falha de conexão.'));
    renderRoute('/campeonatos/novo');
    fireEvent.change(screen.getByLabelText('Nome do campeonato'), {
      target: { value: 'Minha Copa' },
    });
    fireEvent.change(screen.getByLabelText('Um nome por linha'), {
      target: { value: 'Lucas\nAna' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar lista' }));
    expect(screen.getByLabelText('Jogador 1', { exact: true })).toHaveValue('Lucas');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() =>
      expect(mock.save).toHaveBeenCalledWith(
        'owner',
        expect.objectContaining({
          name: 'Minha Copa',
          status: 'draft',
          players: ['Lucas', 'Ana', '', '', '', '', '', ''],
        }),
        null,
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de conexão');
    expect(screen.getByLabelText('Jogador 1', { exact: true })).toHaveValue('Lucas');
  });
  it('shows a public read-only bracket without editing controls', async () => {
    mock.state = { ...mock.state, status: 'anonymous', user: null };
    renderRoute('/campeonatos/cup');
    expect(await screen.findByRole('heading', { name: 'Copa dos Reis' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar placar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar arte JPG' })).toBeVisible();
  });
  it('submits an owner score and advances the player after persistence succeeds', async () => {
    mock.save.mockImplementation(async (_uid: string, input: object) => ({
      ...item(),
      ...input,
      revision: 2,
    }));
    renderRoute('/campeonatos/cup');
    const match = await screen.findByRole('article', { name: 'Confronto 0-0' });
    fireEvent.change(within(match).getByRole('spinbutton', { name: 'Placar de Lucas' }), {
      target: { value: '2' },
    });
    fireEvent.click(within(match).getByRole('button', { name: 'Salvar placar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Placar salvo');
    expect(
      within(screen.getByRole('article', { name: 'Confronto 1-0' })).getByText('Lucas'),
    ).toBeVisible();
  });
  it('does not advance a player if the score cannot be saved', async () => {
    mock.save.mockRejectedValue(new Error('Sem conexão.'));
    renderRoute('/campeonatos/cup');
    const match = await screen.findByRole('article', { name: 'Confronto 0-0' });
    fireEvent.change(within(match).getByRole('spinbutton', { name: 'Placar de Lucas' }), {
      target: { value: '2' },
    });
    fireEvent.click(within(match).getByRole('button', { name: 'Salvar placar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
    expect(
      within(screen.getByRole('article', { name: 'Confronto 1-0' })).queryByText('Lucas'),
    ).not.toBeInTheDocument();
  });
});
