import assert from 'node:assert/strict';

const origin = process.env.CUP_TEST_ORIGIN || 'http://127.0.0.1:5300';
async function get(path) {
  return fetch(new URL(path, origin), { signal: AbortSignal.timeout(10_000) });
}
async function remoteEntry(path) {
  // Docker DNS may briefly cache the remote's absence from the partial-start test.
  const deadline = Date.now() + 20_000;
  let response;
  do {
    response = await get(path);
    if (response.status < 500) return response;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  return response;
}
const health = await get('/api/health');
assert.equal(health.status, 200, 'BFF health');
assert.equal((await health.json()).service, 'clash-cup-api');
const configResponse = await get('/runtime-config.json');
assert.equal(configResponse.status, 200, 'runtime configuration');
assert.match(configResponse.headers.get('cache-control'), /no-store/);
const config = await configResponse.json();
for (const name of ['portal', 'auth', 'competition', 'player', 'admin']) {
  assert.equal(config.remotes[name], `/remotes/${name}/remoteEntry.js`);
  const entry = await remoteEntry(config.remotes[name]);
  assert.equal(entry.status, 200, `${name}: remote entry`);
  assert.match(entry.headers.get('content-type'), /javascript/, `${name}: module content type`);
  assert.match(entry.headers.get('cache-control'), /no-store/);
  const missing = await get(`/remotes/${name}/assets/missing-file.js`);
  assert.equal(missing.status, 404, `${name}: missing chunks cannot return SPA HTML`);
  assert.match(missing.headers.get('cache-control'), /no-store/);
}
for (const path of ['/contato', '/torneios/cup', '/entrar', '/perfil', '/admin']) {
  const page = await get(path);
  assert.equal(page.status, 200, `SPA deep link ${path}`);
  assert.match(page.headers.get('content-type'), /text\/html/);
}
const invalidTag = await get('/api/player?idclash=!');
assert.equal(invalidTag.status, 400, 'BFF validates input through the gateway');
const unauthenticatedAdmin = await get('/api/admin/tournaments');
assert.equal(unauthenticatedAdmin.status, 401, 'admin is protected without contacting Firebase');
console.log('Docker: gateway, BFF, cinco remotos, rotas diretas e controle de cache verificados.');
