import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useState } from 'react';
import { Icon } from './Icon';

const Logout = styled.button`
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid var(--cup-border);
  border-radius: 8px;
  background: var(--cup-panel-raised);
  color: var(--cup-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
export function AccountMenu({
  authenticated,
  initializing,
  pending,
  onSignOut,
}: {
  authenticated: boolean;
  initializing: boolean;
  pending: boolean;
  onSignOut: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  if (initializing) return <span role="status">Carregando conta…</span>;
  if (!authenticated)
    return (
      <Link to="/entrar">
        <Icon name="user" size={18} />
        Entrar
      </Link>
    );
  async function logout() {
    setError(null);
    try {
      await onSignOut();
      navigate('/');
    } catch {
      setError('Não foi possível sair da conta. Tente novamente.');
    }
  }
  return (
    <>
      <Link to="/minha-conta">
        <Icon name="user" size={18} />
        Minha conta
      </Link>
      <Logout onClick={() => void logout()} disabled={pending}>
        <Icon name="logout" size={16} />
        Sair
      </Logout>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
