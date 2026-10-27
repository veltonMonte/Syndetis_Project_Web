import assert from 'node:assert/strict';
import { after, before, it } from 'node:test';
import { createServer, request as httpRequest } from 'node:http';
import express from 'express';
import { receiveBody } from '../dist/request-body.js';

let server, base, forwarded = 0;
before(async () => {
  const app = express();
  app.use(receiveBody(64, 150));
  app.use((request, response) => { forwarded++; response.end(request.body); });
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });

function send(headers, chunks, end = true) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(base, { method: 'POST', headers }, (response) => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.flushHeaders();
    for (const chunk of chunks) request.write(chunk);
    if (end) request.end();
  });
}
it('preserva exatamente os bytes recebidos para validar assinatura no destino', async () => {
  const body = Buffer.from(' { "nome" : "ação", "total":29.90 }\n');
  const response = await fetch(base, { method: 'POST', body });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
});
it('rejeita Content-Length excessivo antes de encaminhar', async () => {
  const before = forwarded;
  assert.equal(await send({ 'Content-Length': '65' }, [], false), 413);
  assert.equal(forwarded, before);
});
it('conta bytes de um corpo chunked sem Content-Length', async () => {
  const before = forwarded;
  assert.equal(await send({ 'Transfer-Encoding': 'chunked' }, [Buffer.alloc(40), Buffer.alloc(40)]), 413);
  assert.equal(forwarded, before);
});
it('encerra upload lento mesmo sem receber todos os bytes', async () => {
  const before = forwarded;
  assert.equal(await send({ 'Content-Length': '10' }, ['a'], false), 408);
  assert.equal(forwarded, before);
});
it('rejeita compressao para nao transferir bombas de descompressao ao destino', async () => {
  assert.equal(await send({ 'Content-Encoding': 'gzip', 'Content-Length': '0' }, []), 415);
});
