import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useState } from 'react';

const Logout = styled.button`
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid #c7d2e6;
  border-radius: 8px;
  background: white;
  color: #17284e;
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
  if (!authenticated) return <Link to="/entrar">Entrar</Link>;
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
      <Link to="/minha-conta">Minha conta</Link>
      <Logout onClick={() => void logout()} disabled={pending}>
        Sair
      </Logout>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
