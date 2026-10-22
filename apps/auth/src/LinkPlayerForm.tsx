import { useRef, useState, type FormEvent } from 'react';
import { clashTagSchema } from '@clash-cup/contracts';
import { getSessionError, session, useSession } from '@clash-cup/session';
import { Button, Card, ErrorText, Field, Form } from './styles';

export function LinkPlayerForm() {
  const state = useSession();
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = clashTagSchema.safeParse(tag);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Informe uma tag válida.');
      input.current?.focus();
      return;
    }
    setMessage(null);
    try {
      await session.linkPlayer(result.data);
    } catch (error) {
      setMessage(getSessionError(error));
    }
  }
  return (
    <Card>
      <h1>Vincule seu jogador</h1>
      <p>Informe a tag que aparece abaixo do seu nome no perfil do Clash Royale.</p>
      <Form onSubmit={submit} noValidate>
        <Field>
          <label htmlFor="player-tag">Tag do jogador</label>
          <input
            ref={input}
            id="player-tag"
            name="tag"
            placeholder="#P0Y9"
            autoComplete="off"
            spellCheck={false}
            value={tag}
            disabled={state.pending}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'tag-error' : 'tag-help'}
            onChange={(event) => {
              setTag(event.target.value);
              setError(null);
              setMessage(null);
            }}
          />
          <small id="tag-help">Você pode informar a tag com ou sem #.</small>
          {error && <ErrorText id="tag-error">{error}</ErrorText>}
        </Field>
        <Button disabled={state.pending} type="submit">
          {state.pending ? 'Consultando jogador…' : 'Vincular jogador'}
        </Button>
        {message && <ErrorText role="alert">{message}</ErrorText>}
      </Form>
    </Card>
  );
}
