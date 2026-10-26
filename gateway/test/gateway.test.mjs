import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createApp } from '../dist/app.js';
import { loadConfig } from '../dist/config.js';

const servers = [];
async function listen(server) {
  if (typeof server === 'function') server = createServer(server);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
let base, config, privateKey, jwksReads = 0;
const subject = '6c09e7dc-c0c8-4b26-873c-380cf6ec6cca';
async function token({ issuer = 'syndetis-test', audience = 'syndetis', expiration = '5m', role = 'CUSTOMER' } = {}) {
  return new SignJWT({ role, email: 'test@example.com' }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject(subject).setIssuer(issuer).setAudience(audience).setExpirationTime(expiration).sign(privateKey);
}
before(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256' };
  const upstream = await listen(createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/.well-known/jwks.json') { jwksReads++; response.end(JSON.stringify({ keys: [jwk] })); return; }
    let body = '';
    for await (const chunk of request) body += chunk;
    response.setHeader('ETag', '"7"');
    response.end(JSON.stringify({ path: request.url, method: request.method, headers: request.headers, body }));
  }));
  config = { ...loadConfig(), issuer: 'syndetis-test', authUrl: upstream, coreUrl: upstream,
    integrationsUrl: upstream, frontendUrl: upstream, jwksUrl: `${upstream}/.well-known/jwks.json` };
  base = await listen(createApp(config));
});
after(async () => { for (const server of servers.reverse()) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } });

describe('Gateway HTTP e validação RS256', () => {
  it('encaminha o catálogo público e preserva query e ETag', async () => {
    const response = await fetch(`${base}/api/core/public/stores/demo/products?page=2`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('etag'), '"7"');
    assert.equal((await response.json()).path, '/api/public/stores/demo/products?page=2');
  });
  it('bloqueia pedidos sem autenticação', async () => { assert.equal((await fetch(`${base}/api/core/orders/me`)).status, 401); });
  it('rejeita token expirado, issuer/audience incorretos e role inválida', async () => {
    for (const options of [{ expiration: '-1s' }, { issuer: 'other' }, { audience: 'other' }, { role: 'ROOT' }]) {
      assert.equal((await fetch(`${base}/api/core/orders/me`, { headers: { Authorization: `Bearer ${await token(options)}` } })).status, 401);
    }
  });
  it('rejeita token adulterado', async () => {
    const value = await token();
    assert.equal((await fetch(`${base}/api/core/orders/me`, { headers: { Authorization: `Bearer ${value.slice(0, -12)}abcdefghijkl` } })).status, 401);
  });
  it('preserva JSON e idempotência, removendo identidades e credenciais internas forjadas', async () => {
    const body = JSON.stringify({ storeId: 'store', items: [{ productId: 'product', quantity: 1 }] });
    const response = await fetch(`${base}/api/core/orders`, { method: 'POST', body,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'test-order',
        'X-User-Role': 'ADMIN', 'X-Internal-Token': 'forged', 'X-Forwarded-For': '1.2.3.4' } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.path, '/api/orders');
    assert.equal(result.body, body);
    assert.equal(result.headers['idempotency-key'], 'test-order');
    assert.equal(result.headers['x-user-role'], undefined);
    assert.equal(result.headers['x-internal-token'], undefined);
    assert.notEqual(result.headers['x-forwarded-for'], '1.2.3.4');
  });
  it('não expõe endpoints internos e bloqueia caminhos codificados', async () => {
    for (const path of ['/internal/payments/checkouts', '/actuator/health', '/api/auth/admin', '/api/core/public/%2Forders']) {
      assert.equal((await fetch(`${base}${path}`)).status, 404);
    }
  });
  it('preserva x-request-id e corpo assinados pelo Mercado Pago', async () => {
    const response = await fetch(`${base}/api/payments/webhooks/mercadopago?data.id=123&type=payment`, {
      method: 'POST', headers: { 'x-request-id': 'signed-request', 'x-signature': 'signed-value' }, body: '{"id":123}',
    });
    const result = await response.json();
    assert.equal(result.path, '/payments/webhook?data.id=123&type=payment');
    assert.equal(result.headers['x-request-id'], 'signed-request');
    assert.equal(result.headers['x-signature'], 'signed-value');
    assert.equal(result.body, '{"id":123}');
  });
  it('usa o cache JWKS nas requisições autenticadas', async () => {
    const headers = { Authorization: `Bearer ${await token()}` };
    for (let i = 0; i < 3; i++) assert.equal((await fetch(`${base}/api/core/orders/me`, { headers })).status, 200);
    assert.equal(jwksReads, 1);
  });
  it('limita tentativas de login', async () => {
    const limited = await listen(createApp({ ...config, authRateLimit: 2 }));
    for (let i = 0; i < 2; i++) assert.equal((await fetch(`${limited}/api/auth/login`, { method: 'POST' })).status, 200);
    assert.equal((await fetch(`${limited}/api/auth/login`, { method: 'POST' })).status, 429);
  });
  it('retorna erro controlado quando um serviço cai', async () => {
    const unavailable = await listen(createApp({ ...config, coreUrl: 'http://127.0.0.1:1' }));
    const response = await fetch(`${unavailable}/api/core/public/stores/demo`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: 'Serviço temporariamente indisponível.' });
  });
});
