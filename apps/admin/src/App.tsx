import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { session, useSession, type SessionUser } from '@clash-cup/session';
import type { AdminOverview } from '@clash-cup/contracts';
import { Container } from '@clash-cup/ui';
import { adminClient, adminError } from './client';
import { Button, Navigation, Panel } from './styles';
import { Imports } from './Imports';
import { Roles } from './Roles';
import { Tournaments } from './Tournaments';
import { Wallets } from './Wallets';

function Authorized({ user }: { user: SessionUser }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    data: AdminOverview | null;
    error: string | null;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void adminClient.overview(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ revision, data, error: null });
      },
      (error) => {
        if (!controller.signal.aborted)
          setResult({ revision, data: null, error: adminError(error) });
      },
    );
    return () => controller.abort();
  }, [revision]);
  function saved(text: string) {
    setNotice(text);
    setRevision((value) => value + 1);
  }
  const data = result?.revision === revision ? result.data : null;
  return (
    <>
      <Navigation aria-label="Administração">
        <NavLink end to="/admin">
          Resumo
        </NavLink>
        <NavLink to="/admin/torneios">Torneios</NavLink>
        <NavLink to="/admin/saldos">Saldos</NavLink>
        <NavLink to="/admin/resultados">Resultados</NavLink>
        {user.superAdmin && <NavLink to="/admin/acessos">Acessos</NavLink>}
      </Navigation>
      {notice && <p role="status">{notice}</p>}
      {result?.revision !== revision ? (
        <p role="status">Carregando administração…</p>
      ) : result.error ? (
        <Panel>
          <h1>Administração indisponível</h1>
          <p role="alert">{result.error}</p>
          <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
        </Panel>
      ) : (
        data && (
          <>
            {data.invalidTournaments + data.invalidWallets + data.invalidImports > 0 && (
              <p role="status">
                Há registros incompletos que precisam de revisão pela organização:{' '}
                {data.invalidTournaments} torneio(s), {data.invalidWallets} saldo(s) e{' '}
                {data.invalidImports} importação(ões).
              </p>
            )}
            <Routes>
              <Route
                path="/admin"
                element={
                  <>
                    <h1>Administração</h1>
                    <Panel>
                      <h2>Visão geral</h2>
                      <p>
                        {data.tournaments.length} torneios · {data.wallets.length} saldos ·{' '}
                        {data.imports.length} importações
                      </p>
                      <Button onClick={() => setRevision((value) => value + 1)}>
                        Atualizar resumo
                      </Button>
                    </Panel>
                  </>
                }
              />
              <Route
                path="/admin/torneios"
                element={<Tournaments data={data} uid={user.uid} saved={saved} />}
              />
              <Route
                path="/admin/saldos"
                element={<Wallets data={data} uid={user.uid} saved={saved} />}
              />
              <Route
                path="/admin/resultados"
                element={<Imports key={user.uid} jobs={data.imports} uid={user.uid} />}
              />
              <Route
                path="/admin/acessos"
                element={<Roles uid={user.uid} superAdmin={user.superAdmin === true} />}
              />
              <Route path="*" element={<Navigate replace to="/admin" />} />
            </Routes>
          </>
        )
      )}
    </>
  );
}
export function App() {
  const state = useSession();
  const [error, setError] = useState<string | null>(null);
  if (state.status === 'initializing')
    return (
      <Container>
        <p role="status">Carregando sua conta…</p>
      </Container>
    );
  if (state.status === 'error' || state.status === 'unconfigured')
    return (
      <Container>
        <h1>Acesso indisponível</h1>
        <p role="alert">{state.error}</p>
        {state.status === 'error' && (
          <Button onClick={() => void session.start()}>Tentar novamente</Button>
        )}
      </Container>
    );
  if (!state.user || state.status !== 'authenticated') return <Navigate replace to="/entrar" />;
  return (
    <Container>
      {state.user.admin !== true ? (
        <>
          <h1>Acesso restrito</h1>
          <p>Esta área exige permissão administrativa.</p>
          <Button
            onClick={() => {
              setError(null);
              void adminClient
                .refreshPermissions()
                .catch((failure) => setError(adminError(failure)));
            }}
          >
            Atualizar permissões
          </Button>
          {error && <p role="alert">{error}</p>}
          <Link to="/">Voltar ao portal</Link>
        </>
      ) : (
        <Authorized key={`${state.user.uid}:${state.user.superAdmin === true}`} user={state.user} />
      )}
    </Container>
  );
}
