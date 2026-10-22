import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runtimeConfigSchema } from './index';

const config = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'));
const frontends = ['shell', 'portal', 'auth', 'competition', 'player', 'admin'];

describe('Vercel service routing contract', () => {
  it('keeps build ownership on each service and exposes the API before the SPA fallback', () => {
    for (const key of [
      'framework',
      'functions',
      'installCommand',
      'buildCommand',
      'devCommand',
      'ignoreCommand',
      'outputDirectory',
    ]) {
      expect(config).not.toHaveProperty(key);
    }
    expect(config.services.api).toMatchObject({
      root: '.',
      runtime: 'node',
      entrypoint: 'apps/api/src/vercel.ts',
    });
    expect(config.rewrites[0]).toEqual({ source: '/api/(.*)', destination: { service: 'api' } });
    expect(config.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: { service: 'shell' } });
  });

  it('exposes every federated entry under the same prefix used by its build output', () => {
    const remotes = Object.fromEntries(
      frontends
        .filter((name) => name !== 'shell')
        .map((name) => [name, `/remotes/${name}/remoteEntry.js`]),
    );
    expect(runtimeConfigSchema.safeParse({ remotes }).success).toBe(true);
    for (const [name, entry] of Object.entries(remotes)) {
      expect(config.services[name].outputDirectory).toBe(`dist/vercel/${name}`);
      expect(config.rewrites).toContainEqual({
        source: entry.replace('/remoteEntry.js', '/:path*'),
        destination: { service: name },
      });
    }
  });

  it('runs static frontends on the CLI assigned port without assigning runtime-only bindings', () => {
    for (const name of frontends) {
      expect(config.services[name].devCommand).toBe(`node scripts/dev-vercel-service.mjs ${name}`);
      expect(config.services[name].bindings ?? []).toHaveLength(0);
    }
  });
});
