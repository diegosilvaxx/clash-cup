import { useEffect, useState } from 'react';
import { roleChangeSchema, type AdminRole } from '@clash-cup/contracts';
import { adminClient, adminError } from './client';
import { Button, Form, Panel } from './styles';
import { useAdminAction } from './useAdminAction';

export function Roles({ uid, superAdmin }: { uid: string; superAdmin: boolean }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    items: AdminRole[];
    error: string | null;
  } | null>(null);
  const [draft, setDraft] = useState({ email: '', action: 'grant' as 'grant' | 'revoke' });
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAdminAction(uid);
  useEffect(() => {
    if (!superAdmin) return;
    const controller = new AbortController();
    void adminClient.roles(controller.signal).then(
      (items) => {
        if (!controller.signal.aborted) setResult({ revision, items, error: null });
      },
      (error) => {
        if (!controller.signal.aborted)
          setResult({ revision, items: [], error: adminError(error) });
      },
    );
    return () => controller.abort();
  }, [superAdmin, revision]);
  if (!superAdmin)
    return (
      <>
        <h1>Gerenciar acessos</h1>
        <p>Somente o administrador responsável pode conceder ou revogar acesso administrativo.</p>
      </>
    );
  return (
    <>
      <h1>Gerenciar acessos</h1>
      <p>
        O acesso administrativo é concedido a uma conta já cadastrada no Firebase Authentication.
      </p>
      {notice && <p role="status">{notice}</p>}
      <Panel>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = roleChangeSchema.safeParse(draft);
            if (!parsed.success) {
              action.setError('Informe um email válido.');
              return;
            }
            setNotice(null);
            void action.run(
              () => adminClient.changeRole(parsed.data.email, parsed.data.action),
              () => {
                setNotice(
                  draft.action === 'grant'
                    ? 'Acesso concedido. A conta deve atualizar as permissões ou entrar novamente.'
                    : 'Acesso revogado. As sessões anteriores precisam de novo login.',
                );
                setRevision((value) => value + 1);
              },
            );
          }}
        >
          <fieldset disabled={action.pending}>
            <label>
              Email da conta
              <input
                required
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </label>
            <label>
              Operação
              <select
                value={draft.action}
                onChange={(event) =>
                  setDraft({ ...draft, action: event.target.value as 'grant' | 'revoke' })
                }
              >
                <option value="grant">Conceder administração</option>
                <option value="revoke">Revogar administração</option>
              </select>
            </label>
            {action.error && <p role="alert">{action.error}</p>}
            <Button type="submit">
              {action.pending ? 'Salvando…' : 'Aplicar alteração de acesso'}
            </Button>
          </fieldset>
        </Form>
      </Panel>
      {result?.revision !== revision ? (
        <p role="status">Carregando administradores…</p>
      ) : result.error ? (
        <>
          <p role="alert">{result.error}</p>
          <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
        </>
      ) : (
        <Panel>
          <h2>Contas administrativas</h2>
          <ul>
            {result.items.map((item) => (
              <li key={item.uid}>
                {item.email ?? item.displayName ?? item.uid}
                {item.superAdmin ? ' · Responsável' : ' · Administrador'}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
