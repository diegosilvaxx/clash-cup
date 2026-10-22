import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
export const aliases = Object.fromEntries(
  ['contracts', 'http', 'ui', 'competitions', 'rewards'].map((name) => [
    `@clash-cup/${name}`,
    fileURLToPath(new URL(`../packages/${name}/src/index.ts`, import.meta.url)),
  ]),
);
