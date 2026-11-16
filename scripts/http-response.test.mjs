import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readApiResponse } from './http-response.mjs';

it('aceita negativas de seguranca esperadas com corpo vazio', async () => {
  for (const status of [401, 403, 409]) {
    assert.equal(await readApiResponse(new Response(null, { status }), 'POST', '/api/core/stores', status), undefined);
  }
});
it('aceita erro esperado independentemente do formato de seu corpo', async () => {
  assert.equal(await readApiResponse(Response.json({ message: 'Forbidden' }, { status: 403 }), 'POST', '/stores', 403), undefined);
});
it('mantem verificacao estrita de status HTTP', async () => {
  await assert.rejects(readApiResponse(new Response(null, { status: 200 }), 'POST', '/stores', 403), /POST \/stores: HTTP 200/);
});
it('aceita 204 e interpreta JSON de respostas de sucesso', async () => {
  assert.equal(await readApiResponse(new Response(null, { status: 204 }), 'POST', '/logout', 204), undefined);
  assert.deepEqual(await readApiResponse(Response.json({ id: 'store' }, { status: 201 }), 'POST', '/stores', 201), { id: 'store' });
});
it('falha com contexto quando uma resposta de sucesso nao possui JSON valido', async () => {
  await assert.rejects(readApiResponse(new Response(''), 'GET', '/orders', 200), /GET \/orders.*JSON obrigatória/);
  await assert.rejects(readApiResponse(new Response('<html>'), 'GET', '/orders', 200), /GET \/orders.*JSON válido/);
});
