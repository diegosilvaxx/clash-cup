import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Container, Notice } from '@clash-cup/ui';
import { loadPortal } from './runtime';

class RemoteBoundary extends Component<
  { children: ReactNode; retry: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Container>
        <Notice role="alert">
          <h1>Não foi possível carregar o portal.</h1>
          <p>O serviço pode estar temporariamente indisponível.</p>
          <button onClick={this.props.retry}>Tentar novamente</button>
        </Notice>
      </Container>
    ) : (
      this.props.children
    );
  }
}

export function RemoteSlot() {
  const [{ attempt, Remote }, setSlot] = useState(() => ({
    attempt: 0,
    Remote: lazy(() => loadPortal()),
  }));
  function retry() {
    const nextAttempt = attempt + 1;
    setSlot({ attempt: nextAttempt, Remote: lazy(() => loadPortal(nextAttempt)) });
  }
  return (
    <RemoteBoundary key={attempt} retry={retry}>
      <Suspense
        fallback={
          <Container>
            <p role="status">Carregando portal…</p>
          </Container>
        }
      >
        <Remote />
      </Suspense>
    </RemoteBoundary>
  );
}
