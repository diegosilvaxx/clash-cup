import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
async function visit(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '__mf__virtual'].includes(item.name)) continue;
    const path = resolve(directory, item.name);
    if (item.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(path)) continue;
    const name = relative(root, path).replaceAll('\\', '/');
    const app = name.match(/^apps\/([^/]+)\/src\//)?.[1];
    const source = await readFile(path, 'utf8');
    const imports = [...source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)];
    for (const match of imports) {
      const specifier = match[1];
      if (app && app !== 'api' && /^firebase(?:\/|$)/.test(specifier))
        failures.push(`${name}: use a sessão compartilhada para acessar Firebase`);
      if (specifier.startsWith('.')) {
        const target = relative(root, resolve(directory, specifier)).replaceAll('\\', '/');
        const targetApp = target.match(/^apps\/([^/]+)\//)?.[1];
        if (app && targetApp && app !== targetApp)
          failures.push(`${name}: import direto de outra aplicação`);
        if (name.startsWith('packages/') && targetApp)
          failures.push(`${name}: pacote compartilhado depende de aplicação`);
      }
      if (app && app !== 'api' && (specifier.startsWith('node:') || specifier === '@clash-cup/api'))
        failures.push(`${name}: dependência de servidor no frontend`);
    }
    if (app && app !== 'api' && /CLASH_ROYALE_API_TOKEN|api\.clashroyale\.com/.test(source))
      failures.push(`${name}: integração externa no frontend`);
  }
}
await visit(resolve(root, 'apps'));
await visit(resolve(root, 'packages'));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('Limites entre aplicações e pacotes verificados.');
