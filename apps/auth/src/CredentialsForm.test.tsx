// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialsForm } from './CredentialsForm';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  google: vi.fn(),
  state: { pending: false },
}));
vi.mock('@clash-cup/session', () => ({
  session: mocks,
  useSession: () => mocks.state,
  getSessionError: () => 'Não foi possível entrar. Tente novamente.',
}));
beforeEach(() => {
  mocks.state.pending = false;
  mocks.signIn.mockResolvedValue(undefined);
  mocks.signUp.mockResolvedValue(undefined);
  mocks.google.mockResolvedValue(undefined);
});
afterEach(cleanup);
function setup(mode: 'signin' | 'signup') {
  render(
    <MemoryRouter>
      <CredentialsForm mode={mode} />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
describe('credential forms', () => {
  it('validates the form and focuses the first invalid input before any request', async () => {
    const user = setup('signin');
    await user.click(screen.getByRole('button', { name: 'Entrar com email' }));
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByText('Informe um email válido.')).toBeVisible();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('does not create an account when the password confirmation differs', async () => {
    const user = setup('signup');
    await user.type(screen.getByLabelText('Email'), 'player@example.test');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'password-one');
    await user.type(screen.getByLabelText('Confirmar senha'), 'password-two');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('As senhas precisam ser iguais.')).toBeVisible();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('preserves entered fields when a login request fails', async () => {
    mocks.signIn.mockRejectedValueOnce(new Error('provider failure'));
    const user = setup('signin');
    await user.type(screen.getByLabelText('Email'), 'player@example.test');
    await user.type(screen.getByLabelText('Senha'), 'password');
    await user.click(screen.getByRole('button', { name: 'Entrar com email' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível entrar'),
    );
    expect(screen.getByLabelText('Email')).toHaveValue('player@example.test');
    expect(mocks.signIn).toHaveBeenCalledWith('player@example.test', 'password');
  });
  it('disables submit and Google actions while an operation is pending', () => {
    mocks.state.pending = true;
    setup('signin');
    expect(screen.getByRole('button', { name: 'Aguarde…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});
