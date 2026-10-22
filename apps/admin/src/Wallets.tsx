import { useState } from 'react';
import { walletBindingSchema, type AdminOverview } from '@clash-cup/contracts';
import { adminClient } from './client';
import { Button, Form, Panel } from './styles';
import { useAdminAction } from './useAdminAction';
export function Wallets({
  data,
  uid,
  saved,
}: {
  data: AdminOverview;
  uid: string;
  saved: (text: string) => void;
}) {
  const [draft, setDraft] = useState({
    walletId: '',
    uid: '',
    reason: '',
    verifiedOwnership: false,
  });
  const action = useAdminAction(uid);
  return (
    <>
      <h1>Associar saldo à conta</h1>
      <p>
        Confira a titularidade com a organização antes de associar. A tag pública, sozinha, não
        comprova a propriedade do saldo.
      </p>
      <Panel>
        {data.wallets.length === 0 ? (
          <p>Nenhum saldo disponível. Os créditos são registrados pela importação de resultados.</p>
        ) : (
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = walletBindingSchema.safeParse(draft);
              if (!parsed.success) {
                action.setError(parsed.error.issues[0]?.message ?? 'Confira os dados.');
                return;
              }
              void action.run(
                () => adminClient.bindWallet(parsed.data),
                () => saved('Saldo associado. O valor e os emblemas foram preservados.'),
              );
            }}
          >
            <fieldset disabled={action.pending}>
              <label>
                Saldo
                <select
                  required
                  value={draft.walletId}
                  onChange={(event) =>
                    setDraft({ ...draft, walletId: event.target.value, verifiedOwnership: false })
                  }
                >
                  <option value="">Selecione</option>
                  {data.wallets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tag} · {item.gold} Gold ·{' '}
                      {item.ownerUid ? 'Associado' : 'Aguardando associação'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                UID da conta
                <input
                  required
                  maxLength={128}
                  value={draft.uid}
                  onChange={(event) =>
                    setDraft({ ...draft, uid: event.target.value, verifiedOwnership: false })
                  }
                />
              </label>
              <p>
                O UID está em Firebase Authentication. A conta precisa ter a mesma tag vinculada no
                portal.
              </p>
              <label>
                Verificação realizada
                <textarea
                  required
                  minLength={5}
                  maxLength={500}
                  value={draft.reason}
                  onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={draft.verifiedOwnership}
                  onChange={(event) =>
                    setDraft({ ...draft, verifiedOwnership: event.target.checked })
                  }
                />
                Confirmei a titularidade deste saldo e o UID da conta.
              </label>
              {action.error && <p role="alert">{action.error}</p>}
              <Button type="submit">{action.pending ? 'Associando…' : 'Associar saldo'}</Button>
            </fieldset>
          </Form>
        )}
      </Panel>
    </>
  );
}
