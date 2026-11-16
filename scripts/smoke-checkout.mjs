import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { readApiResponse } from './http-response.mjs';

const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080';
const sellerEmail = process.env.HOMOLOGATION_SELLER_EMAIL;
const sellerPassword = process.env.HOMOLOGATION_SELLER_PASSWORD;
assert.ok(sellerEmail && sellerPassword, 'Configure HOMOLOGATION_SELLER_EMAIL e HOMOLOGATION_SELLER_PASSWORD.');

async function api(path, { token, body, method = 'GET', headers = {}, status = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, signal: AbortSignal.timeout(15000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return readApiResponse(response, method, path, status);
}
const core = (path, options) => api(`/api/core${path}`, options);

let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(`${base}/api/core/public/stores/smoke-readiness-probe`, { signal: AbortSignal.timeout(2000) });
    if (response.status === 404) { ready = true; break; }
  } catch { /* aguarda os serviços do ambiente de teste */ }
  await setTimeout(1000);
}
assert.ok(ready, 'O gateway e o core não ficaram disponíveis.');

const seller = (await api('/api/auth/login', { method: 'POST', body: { email: sellerEmail, password: sellerPassword } })).accessToken;
const customerEmail = `smoke-${randomUUID()}@example.test`;
const password = `Smoke-${randomUUID()}!`;
await api('/api/auth/register', { method: 'POST', status: 201, body: { firstName: 'Cliente smoke', email: customerEmail, password, role: 'ADMIN' } });
const buyer = (await api('/api/auth/login', { method: 'POST', body: { email: customerEmail, password } })).accessToken;
await core('/stores', { method: 'POST', token: buyer, status: 403, body: { name: 'Forbidden', slug: 'forbidden' } });
await core('/orders/me', { status: 401 });

const store = await core('/stores', { method: 'POST', token: seller, status: 201,
  body: { name: 'Loja smoke', slug: `smoke-${randomUUID()}`, shippingFee: 8.5, deliveryInstructions: 'Envio realizado pelo vendedor.' } });
const product = await core(`/stores/${store.id}/products`, { method: 'POST', token: seller, status: 201,
  body: { name: 'Produto smoke', price: 39.9, sku: 'SMOKE-001' } });
await core(`/stores/${store.id}/inventory/${product.id}/movements`, { method: 'POST', token: seller, body: { delta: 2, reason: 'Carga smoke' } });
const layout = await core(`/stores/${store.id}/layout`, { token: seller });
await core(`/stores/${store.id}/layout/publish`, { method: 'POST', token: seller, headers: { 'If-Match': `"${layout.version}"` } });
const publicStore = await core(`/public/stores/${store.slug}`);
assert.equal(publicStore.shippingFee, 8.5);
assert.equal((await core(`/public/stores/${store.slug}/products`)).content[0].id, product.id);

const address = await core('/customers/me/addresses', { method: 'POST', token: buyer, status: 201,
  body: { zipCode: '01001000', street: 'Rua de teste', number: '10', city: 'São Paulo', state: 'SP' } });
const key = randomUUID();
const payload = { storeId: store.id, addressId: address.id, items: [{ productId: product.id, quantity: 1, price: 0.01 }], shipping: 0 };
const responses = await Promise.all(Array.from({ length: 4 }, () => core('/orders', {
  method: 'POST', token: buyer, status: 201, headers: { 'Idempotency-Key': key }, body: payload,
})));
assert.equal(new Set(responses.map((order) => order.id)).size, 1);
const order = responses[0];
assert.equal(order.total, 48.4);
assert.ok(order.deliveryAddress.includes('Rua de teste'));
assert.equal((await core(`/stores/${store.id}/inventory`, { token: seller }))[0].reserved, 1);
await core(`/stores/${store.id}/orders/${order.id}/status`, { method: 'PATCH', token: seller, status: 409, body: { status: 'PAID' } });
await core(`/orders/${order.id}/cancel`, { method: 'POST', token: buyer });
assert.equal((await core(`/stores/${store.id}/inventory`, { token: seller }))[0].available, 2);
console.info('Smoke aprovado: gateway, autenticação, permissões, vitrine, endereço, total, idempotência e cancelamento.');
console.info('O pagamento real de teste é validado separadamente com a aplicação do Mercado Pago configurada.');
