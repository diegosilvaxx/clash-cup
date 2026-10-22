import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Container, Notice } from '@clash-cup/ui';
import type { RemoteName } from '@clash-cup/contracts';
import { loadRemoteApp } from './runtime';

class RemoteBoundary extends Component<
  { children: ReactNode; retry: () => void; label: string },
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
          <h1>Não foi possível carregar {this.props.label}.</h1>
          <p>O serviço pode estar temporariamente indisponível.</p>
          <button onClick={this.props.retry}>Tentar novamente</button>
        </Notice>
      </Container>
    ) : (
      this.props.children
    );
  }
}

export function RemoteSlot({ name = 'portal' }: { name?: RemoteName }) {
  const [{ attempt, Remote }, setSlot] = useState(() => ({
    attempt: 0,
    Remote: lazy(() => loadRemoteApp(name)),
  }));
  function retry() {
    const nextAttempt = attempt + 1;
    setSlot({ attempt: nextAttempt, Remote: lazy(() => loadRemoteApp(name, nextAttempt)) });
  }
  return (
    <RemoteBoundary
      key={attempt}
      retry={retry}
      label={
        {
          portal: 'o portal',
          auth: 'o acesso à conta',
          competition: 'os torneios',
          player: 'a área do jogador',
        }[name]
      }
    >
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
