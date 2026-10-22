// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { LinkPlayerForm } from './LinkPlayerForm';

const mocks = vi.hoisted(() => ({ linkPlayer: vi.fn() }));
vi.mock('@clash-cup/session', () => ({
  session: mocks,
  useSession: () => ({ pending: false }),
  getSessionError: () => 'Não foi possível vincular o jogador.',
}));
afterEach(cleanup);
it('keeps an invalid tag out of the request and focuses its input', async () => {
  const user = userEvent.setup();
  render(<LinkPlayerForm />);
  await user.type(screen.getByLabelText('Tag do jogador'), 'bad/tag');
  await user.click(screen.getByRole('button', { name: 'Vincular jogador' }));
  expect(screen.getByLabelText('Tag do jogador')).toHaveFocus();
  expect(mocks.linkPlayer).not.toHaveBeenCalled();
});
it('preserves the tag and allows another attempt after a failed save', async () => {
  mocks.linkPlayer.mockRejectedValueOnce(new Error('failed'));
  const user = userEvent.setup();
  render(<LinkPlayerForm />);
  await user.type(screen.getByLabelText('Tag do jogador'), '#p0y');
  await user.click(screen.getByRole('button', { name: 'Vincular jogador' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível vincular');
  expect(screen.getByLabelText('Tag do jogador')).toHaveValue('#p0y');
});
