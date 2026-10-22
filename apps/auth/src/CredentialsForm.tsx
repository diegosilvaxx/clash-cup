import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { signInSchema, signUpSchema } from '@clash-cup/contracts';
import { getSessionError, session, useSession } from '@clash-cup/session';
import { Button, Card, ErrorText, Field, Form, GoogleButton } from './styles';

type FieldName = 'email' | 'password' | 'confirmPassword';
export function CredentialsForm({ mode }: { mode: 'signin' | 'signup' }) {
  const state = useSession();
  const signup = mode === 'signup';
  const [fields, setFields] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  function update(name: FieldName, value: string) {
    setFields((fields) => ({ ...fields, [name]: value }));
    setErrors((errors) => ({ ...errors, [name]: undefined }));
    setMessage(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = (signup ? signUpSchema : signInSchema).safeParse(fields);
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'email' || key === 'password' || key === 'confirmPassword') && !next[key])
          next[key] = issue.message;
      }
      setErrors(next);
      const first = form.current?.elements.namedItem(Object.keys(next)[0] ?? 'email');
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    setMessage(null);
    try {
      await (signup
        ? session.signUp(parsed.data.email, parsed.data.password)
        : session.signIn(parsed.data.email, parsed.data.password));
    } catch (error) {
      setMessage(getSessionError(error));
    }
  }
  async function google() {
    setMessage(null);
    try {
      await session.google();
    } catch (error) {
      setMessage(getSessionError(error));
    }
  }
  return (
    <Card aria-labelledby="auth-title">
      <h1 id="auth-title">{signup ? 'Crie sua conta' : 'Entre na sua conta'}</h1>
      <p>{signup ? 'Faça parte da comunidade Clash Cup.' : 'Continue sua jornada na Clash Cup.'}</p>
      <Form
        ref={form}
        onSubmit={submit}
        noValidate
        aria-label={signup ? 'Criar conta' : 'Entrar na conta'}
      >
        <fieldset disabled={state.pending}>
          <Field>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={fields.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              onChange={(event) => update('email', event.target.value)}
            />
            {errors.email && <ErrorText id="email-error">{errors.email}</ErrorText>}
          </Field>
          <Field>
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              value={fields.password}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? 'password-error' : signup ? 'password-help' : undefined
              }
              onChange={(event) => update('password', event.target.value)}
            />
            {signup && <small id="password-help">Use pelo menos 6 caracteres.</small>}
            {errors.password && <ErrorText id="password-error">{errors.password}</ErrorText>}
          </Field>
          {signup && (
            <Field>
              <label htmlFor="auth-confirm">Confirmar senha</label>
              <input
                id="auth-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={fields.confirmPassword}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                onChange={(event) => update('confirmPassword', event.target.value)}
              />
              {errors.confirmPassword && (
                <ErrorText id="confirm-error">{errors.confirmPassword}</ErrorText>
              )}
            </Field>
          )}
          <Button type="submit">
            {state.pending ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar com email'}
          </Button>
        </fieldset>
      </Form>
      <GoogleButton type="button" onClick={() => void google()} disabled={state.pending}>
        Continuar com Google
      </GoogleButton>
      {message && <ErrorText role="alert">{message}</ErrorText>}
      <p>
        {signup ? 'Já tem uma conta? ' : 'Ainda não tem uma conta? '}
        <Link to={signup ? '/entrar' : '/cadastro'}>{signup ? 'Entrar' : 'Criar conta'}</Link>
      </p>
    </Card>
  );
}
