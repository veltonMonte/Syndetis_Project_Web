import assert from 'node:assert/strict';
import { after, before, it } from 'node:test';
import { createServer } from 'node:http';
import { createApp } from '../dist/app.js';
import { loadConfig } from '../dist/config.js';

const servers = [];
async function listen(app) {
  const server = createServer(app); servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
let upstream;
before(async () => { upstream = await listen((request, response) => response.end(JSON.stringify(request.headers))); });
after(async () => { for (const server of servers.reverse()) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } });
const config = (extra = {}) => ({ ...loadConfig({}), coreUrl: upstream, authUrl: upstream, authRateLimit: 1, ...extra });
it('falha fechado quando falta a allowlist do proxy ou a cadeia tem mais de um salto', () => {
  assert.throws(() => loadConfig({ TRUSTED_PROXY_HOPS: '1' }), /TRUSTED_PROXY_CIDRS/);
  assert.throws(() => loadConfig({ TRUSTED_PROXY_HOPS: '2', TRUSTED_PROXY_CIDRS: '127.0.0.1' }));
  assert.throws(() => loadConfig({ TRUSTED_PROXY_CIDRS: 'not-an-ip' }));
  assert.throws(() => loadConfig({ TRUSTED_PROXY_CIDRS: '127.0.0.1/33' }));
});
it('cliente direto nao muda seu IP nem escapa do rate limit com cabecalhos falsificados', async () => {
  const base = await listen(createApp(config()));
  const headers = { 'X-Forwarded-For': '198.51.100.10', 'CF-Connecting-IP': '198.51.100.20', 'X-Real-IP': '198.51.100.30' };
  const result = await (await fetch(`${base}/api/core/public/plans`, { headers })).json();
  assert.match(result['x-forwarded-for'], /127\.0\.0\.1/);
  assert.equal(result['cf-connecting-ip'], undefined); assert.equal(result['x-real-ip'], undefined);
  assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', headers })).status, 200);
  headers['X-Forwarded-For'] = '198.51.100.99';
  assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', headers })).status, 429);
});
it('somente um peer confiavel separa clientes pelo IP normalizado na borda', async () => {
  const base = await listen(createApp(config({ trustedProxyHops: 1, trustedProxyCidrs: ['127.0.0.1/32'] })));
  for (const ip of ['198.51.100.10', '198.51.100.20']) {
    const headers = { 'X-Forwarded-For': ip };
    assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', headers })).status, 200);
    assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', headers })).status, 429);
  }
  const result = await (await fetch(`${base}/api/core/public/plans`, { headers: { 'X-Forwarded-For': '203.0.113.1, 198.51.100.10' } })).json();
  assert.equal(result['x-forwarded-for'], '198.51.100.10');
});
it('peer fora da allowlist nao pode fornecer IP de cliente', async () => {
  const base = await listen(createApp(config({ trustedProxyHops: 1, trustedProxyCidrs: ['192.0.2.1/32'] })));
  const result = await (await fetch(`${base}/api/core/public/plans`, { headers: { 'X-Forwarded-For': '198.51.100.10' } })).json();
  assert.match(result['x-forwarded-for'], /127\.0\.0\.1/);
});
