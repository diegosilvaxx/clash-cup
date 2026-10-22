import { useEffect, useRef, useState } from 'react';
import { session } from '@clash-cup/session';
import { importPeriodSchema, type ImportJob, type ImportPreview } from '@clash-cup/contracts';
import { adminClient, adminError } from './client';
import { Button, Form, Panel, TableFrame } from './styles';

export function Imports({ jobs, uid }: { jobs: ImportJob[]; uid: string }) {
  const [draft, setDraft] = useState(() => ({
    tag: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }));
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const control = useRef<{ controller: AbortController; pause: boolean } | null>(null);
  useEffect(
    () => () => {
      control.current?.controller.abort();
    },
    [],
  );
  function valid(run: { controller: AbortController }) {
    return !run.controller.signal.aborted && session.getSnapshot().user?.uid === uid;
  }
  async function inspect() {
    if (control.current) return;
    const parsed = importPeriodSchema.safeParse(draft);
    if (!parsed.success) {
      setError('Informe a tag e um período válido.');
      return;
    }
    const run = { controller: new AbortController(), pause: false };
    control.current = run;
    setPending(true);
    setError(null);
    setPreview(null);
    setJob(null);
    setConfirmed(false);
    try {
      const result = await adminClient.preview(parsed.data, run.controller.signal);
      if (valid(run)) setPreview(result);
    } catch (failure) {
      if (valid(run)) {
        setError(adminError(failure));
        setPaused(true);
      }
    } finally {
      control.current = null;
      if (valid(run)) setPending(false);
    }
  }
  async function process(existing?: ImportJob) {
    if (control.current || (!existing && (!preview || (!preview.existing && !confirmed)))) return;
    const run = { controller: new AbortController(), pause: false };
    control.current = run;
    setPending(true);
    setPaused(false);
    setError(null);
    try {
      let current =
        existing ?? preview?.existing ?? (await adminClient.start(preview!, run.controller.signal));
      if (!valid(run)) return;
      setJob(current);
      while (current.status !== 'completed' && !run.pause && valid(run)) {
        current = await adminClient.process(current.id, run.controller.signal);
        if (valid(run)) setJob(current);
      }
      if (valid(run)) setPaused(run.pause && current.status !== 'completed');
    } catch (failure) {
      if (valid(run)) {
        setError(adminError(failure));
        setPaused(true);
      }
    } finally {
      control.current = null;
      if (valid(run)) setPending(false);
    }
  }
  const update = (fields: Partial<typeof draft>) => {
    setDraft({ ...draft, ...fields });
    setPreview(null);
    setConfirmed(false);
  };
  const registered = jobs.map((item) => (job && item.id === job.id ? job : item));
  if (job && !registered.some((item) => item.id === job.id)) registered.push(job);
  return (
    <>
      <h1>Importar resultados</h1>
      <p>Consulte um torneio encerrado e confira o período antes de creditar os pontos e o Gold.</p>
      <Panel>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void inspect();
          }}
        >
          <fieldset disabled={pending}>
            <label>
              Tag do torneio
              <input
                required
                value={draft.tag}
                onChange={(event) => update({ tag: event.target.value })}
                placeholder="#ABC123"
                maxLength={21}
              />
            </label>
            <label>
              Ano
              <input
                required
                type="number"
                min={2000}
                max={9999}
                step={1}
                value={draft.year}
                onChange={(event) => update({ year: Number(event.target.value) })}
              />
            </label>
            <label>
              Mês
              <select
                value={draft.month}
                onChange={(event) => update({ month: Number(event.target.value) })}
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {String(index + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">{pending ? 'Aguarde…' : 'Consultar resultado'}</Button>
          </fieldset>
        </Form>
      </Panel>
      {error && (
        <p role="alert">
          {error} As gravações já concluídas ficam preservadas; atualize a página ou retome a
          importação.
        </p>
      )}
      {preview && (
        <Panel>
          <h2>{preview.name}</h2>
          <p>
            {preview.tag} · {preview.month}/{preview.year} · {preview.members.length} jogadores
          </p>
          <TableFrame>
            <table>
              <caption>
                Prévia dos primeiros {Math.min(10, preview.members.length)} jogadores
              </caption>
              <thead>
                <tr>
                  <th scope="col">Jogador</th>
                  <th scope="col">Pontos e Gold</th>
                </tr>
              </thead>
              <tbody>
                {preview.members.slice(0, 10).map((member) => (
                  <tr key={member.tag}>
                    <th scope="row">
                      {member.name} ({member.tag})
                    </th>
                    <td>{member.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          {!preview.existing && (
            <Form onSubmit={(event) => event.preventDefault()}>
              <label>
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={pending}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Confirmei o período e que este torneio ainda não foi creditado pelo sistema antigo.
              </label>
            </Form>
          )}
          <Button
            disabled={
              pending ||
              (!preview.existing && !confirmed) ||
              preview.existing?.status === 'completed' ||
              job?.status === 'completed'
            }
            onClick={() => void process()}
          >
            {preview.existing ? 'Retomar importação registrada' : 'Confirmar e importar'}
          </Button>
        </Panel>
      )}
      {job && (
        <Panel>
          <h2>{job.name}</h2>
          <p role="status">
            {job.processed} de {job.total} jogadores processados.{' '}
            {job.status === 'completed'
              ? 'Importação concluída.'
              : paused
                ? 'Importação pausada.'
                : 'Importação em andamento.'}
          </p>
          <progress aria-label="Progresso da importação" max={job.total} value={job.processed} />
          {pending && job.status !== 'completed' && (
            <Button
              onClick={() => {
                if (control.current) control.current.pause = true;
                setPaused(true);
              }}
            >
              Pausar após o lote atual
            </Button>
          )}
          {!pending && job.status !== 'completed' && (
            <Button onClick={() => void process(job)}>Retomar importação</Button>
          )}
        </Panel>
      )}
      <Panel>
        <h2>Importações registradas</h2>
        {registered.length === 0 ? (
          <p>Nenhuma importação registrada.</p>
        ) : (
          <ul>
            {registered.map((item) => (
              <li key={item.id}>
                {item.name} · {item.month}/{item.year} · {item.processed}/{item.total} ·{' '}
                {item.status === 'completed' ? (
                  'Concluída'
                ) : (
                  <Button
                    disabled={pending || (job?.id === item.id && job.status === 'completed')}
                    onClick={() => void process(item)}
                  >
                    Retomar {item.tag}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
