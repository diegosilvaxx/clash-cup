import { useState } from 'react';
import {
  adminTournamentInputSchema,
  type AdminTournament,
  type AdminTournamentInput,
  type AdminOverview,
} from '@clash-cup/contracts';
import { adminClient } from './client';
import { Button, Form, Panel } from './styles';
import { useAdminAction } from './useAdminAction';

function Editor({
  initial,
  uid,
  saved,
}: {
  initial: AdminTournament | undefined;
  uid: string;
  saved: (text: string) => void;
}) {
  const [draft, setDraft] = useState<AdminTournamentInput>(
    () =>
      initial ?? {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        date: '',
        tournamentLink: '',
        vacancies: 1000,
        status: 'open' as const,
      },
  );
  const action = useAdminAction(uid);
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = adminTournamentInputSchema.safeParse(draft);
        if (!parsed.success) {
          action.setError(parsed.error.issues[0]?.message ?? 'Confira os dados.');
          return;
        }
        void action.run(
          () => adminClient.saveTournament(parsed.data, !initial),
          () => saved(initial ? 'Torneio atualizado.' : 'Torneio criado.'),
        );
      }}
    >
      <fieldset disabled={action.pending}>
        <legend>{initial ? 'Editar torneio' : 'Criar torneio'}</legend>
        <label>
          Nome
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        <label>
          Descrição
          <textarea
            maxLength={10000}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </label>
        <label>
          Data e horário
          <input
            placeholder="2026-11-15T20:00"
            maxLength={100}
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
        </label>
        <label>
          Link do torneio
          <input
            type="url"
            value={draft.tournamentLink}
            onChange={(event) => setDraft({ ...draft, tournamentLink: event.target.value })}
          />
        </label>
        <label>
          Capacidade
          <input
            required
            type="number"
            min={Math.max(1, initial?.occupied ?? 0)}
            step={1}
            value={draft.vacancies}
            onChange={(event) => setDraft({ ...draft, vacancies: Number(event.target.value) })}
          />
        </label>
        {initial && <p>{initial.occupied} inscrição(ões). O contador é preservado ao editar.</p>}
        <label>
          Inscrições
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as 'open' | 'closed' })
            }
          >
            <option value="open">Abertas</option>
            <option value="closed">Encerradas</option>
          </select>
        </label>
        {action.error && <p role="alert">{action.error}</p>}
        <Button type="submit">
          {action.pending ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar torneio'}
        </Button>
      </fieldset>
    </Form>
  );
}
export function Tournaments({
  data,
  uid,
  saved,
}: {
  data: AdminOverview;
  uid: string;
  saved: (text: string) => void;
}) {
  const [selected, setSelected] = useState('');
  return (
    <>
      <h1>Administrar torneios</h1>
      <Panel>
        <label>
          Selecionar torneio{' '}
          <select
            aria-label="Selecionar torneio"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Novo torneio</option>
            {data.tournaments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <Editor
          key={selected}
          initial={data.tournaments.find((item) => item.id === selected)}
          uid={uid}
          saved={saved}
        />
      </Panel>
    </>
  );
}
