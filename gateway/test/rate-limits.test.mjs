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
before(async () => { upstream = await listen((_request, response) => response.end('{}')); });
after(async () => { for (const server of servers.reverse()) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } });
const app = () => createApp({ ...loadConfig({}), authUrl: upstream, coreUrl: upstream, integrationsUrl: upstream,
  publicReadRateLimit: 2, shippingRateLimit: 2, webhookRateLimit: 2 }, async () => {});

it('limita catalogo e planos no mesmo grupo, retornando Retry-After', async () => {
  const base = await listen(app());
  assert.equal((await fetch(`${base}/api/core/public/plans`)).status, 200);
  assert.equal((await fetch(`${base}/api/core/public/stores/demo`)).status, 200);
  const response = await fetch(`${base}/api/core/public/stores/demo/products`);
  assert.equal(response.status, 429); assert.ok(response.headers.get('retry-after')); assert.ok(response.headers.get('ratelimit'));
  assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST' })).status, 200);
  assert.equal((await fetch(`${base}/api/billing/webhooks/asaas`, { method: 'POST' })).status, 200);
});
it('cadastro de lojista, cadastro de comprador e login dividem o mesmo limite de tentativas', async () => {
  const base = await listen(createApp({ ...loadConfig({}), authUrl: upstream, coreUrl: upstream, integrationsUrl: upstream,
    authRateLimit: 2 }, async () => {}));
  assert.equal((await fetch(`${base}/api/auth/register/seller`, { method: 'POST' })).status, 200);
  assert.equal((await fetch(`${base}/api/auth/register`, { method: 'POST' })).status, 200);
  assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST' })).status, 429);
});
it('consulta por codigo de compra tem limite proprio, mais restrito e separado da vitrine', async () => {
  const base = await listen(createApp({ ...loadConfig({}), authUrl: upstream, coreUrl: upstream, integrationsUrl: upstream,
    orderLookupRateLimit: 2, publicReadRateLimit: 100 }, async () => {}));
  for (const code of ['AAAA-AAAA', 'BBBB-BBBB']) assert.equal((await fetch(`${base}/api/core/public/orders/${code}`)).status, 200);
  const blocked = await fetch(`${base}/api/core/public/orders/CCCC-CCCC`);
  assert.equal(blocked.status, 429); assert.ok(blocked.headers.get('retry-after'));
  assert.equal((await fetch(`${base}/api/core/public/stores/demo`)).status, 200);
});
it('limite padrao da consulta por codigo e 10 por 15 minutos', () => {
  assert.equal(loadConfig({}).orderLookupRateLimit, 10);
  assert.equal(loadConfig({ ORDER_LOOKUP_RATE_LIMIT: '25' }).orderLookupRateLimit, 25);
});
it('limita cotacoes autenticadas sem alterar regras de acesso', async () => {
  const base = await listen(app());
  const path = `${base}/api/integrations/shipping/quotes`;
  const options = { method: 'POST', headers: { Authorization: 'Bearer test' } };
  for (let i = 0; i < 2; i++) assert.equal((await fetch(path, options)).status, 200);
  assert.equal((await fetch(path, options)).status, 429);
  const fresh = await listen(app());
  assert.equal((await fetch(`${fresh}/api/integrations/shipping/quotes`, { method: 'POST' })).status, 401);
});
it('aplica teto de webhook independente de leitura publica', async () => {
  const base = await listen(app());
  for (const path of ['/api/billing/webhooks/asaas', '/api/payments/webhooks/mercadopago']) {
    assert.equal((await fetch(`${base}${path}`, { method: 'POST' })).status, 200);
  }
  assert.equal((await fetch(`${base}/api/integrations/webhooks/demo`, { method: 'POST' })).status, 429);
  assert.equal((await fetch(`${base}/api/core/public/plans`)).status, 200);
});
it('rejeita configuracoes que desabilitariam os limites silenciosamente', () => {
  assert.throws(() => loadConfig({ PUBLIC_READ_RATE_LIMIT: '0' }));
  assert.throws(() => loadConfig({ SHIPPING_RATE_LIMIT: '-1' }));
  assert.throws(() => loadConfig({ WEBHOOK_RATE_LIMIT: 'invalid' }));
});
