import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('loads Firebase Admin and verifies JWKS signatures without require(esm)', () => {
  // A separate Node process exercises the installed dependencies without Vitest transforms.
  const result = execFileSync(
    process.execPath,
    [
      '--no-experimental-require-module',
      '--input-type=module',
      '-e',
      `
        import assert from 'node:assert/strict';
        import { generateKeyPairSync, sign, verify } from 'node:crypto';
        import { createRequire } from 'node:module';
        await import('firebase-admin/auth');
        await import('firebase-admin/firestore');

        const require = createRequire(import.meta.url);
        const adminRequire = createRequire(require.resolve('firebase-admin/app'));
        const jwksClient = adminRequire('jwks-rsa');
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        const client = jwksClient({
          jwksUri: 'https://keys.example.test/jwks.json',
          fetcher: async () => ({ keys: [{
            ...publicKey.export({ format: 'jwk' }),
            kid: 'test-key', alg: 'RS256', use: 'sig',
          }] }),
        });
        const key = await client.getSigningKey('test-key');
        const message = Buffer.from('clash-cup-runtime-check');
        const signature = sign('RSA-SHA256', message, privateKey);
        assert.equal(verify('RSA-SHA256', message, key.getPublicKey(), signature), true);
        assert.equal(verify('RSA-SHA256', Buffer.from('changed'), key.getPublicKey(), signature), false);
        console.log('firebase-commonjs-compatible');
      `,
    ],
    {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    },
  );
  expect(result.trim()).toBe('firebase-commonjs-compatible');
}, 20000);
