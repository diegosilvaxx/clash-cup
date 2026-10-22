import { describe, expect, it } from 'vitest';
import { signInSchema, signUpSchema } from './index';

describe('auth validation', () => {
  it('trims email without changing the password', () => {
    expect(signInSchema.parse({ email: ' player@example.test ', password: ' password ' })).toEqual({
      email: 'player@example.test',
      password: ' password ',
    });
  });
  it('does not enforce new account password rules on an existing login', () => {
    expect(signInSchema.safeParse({ email: 'player@example.test', password: 'x' }).success).toBe(
      true,
    );
    expect(
      signUpSchema.safeParse({ email: 'player@example.test', password: 'x', confirmPassword: 'x' })
        .success,
    ).toBe(false);
  });
  it('rejects a password mismatch and accepts a valid registration', () => {
    const fields = {
      email: 'player@example.test',
      password: 'safe-password',
      confirmPassword: 'other-password',
    };
    expect(signUpSchema.safeParse(fields).success).toBe(false);
    expect(signUpSchema.safeParse({ ...fields, confirmPassword: fields.password }).success).toBe(
      true,
    );
  });
});
