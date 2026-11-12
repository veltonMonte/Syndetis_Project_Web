import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import worker, { CLIENT_IP_HEADER, EDGE_SECRET_HEADER, isProxied, toOriginRequest } from '../worker/index.ts'

const env = { API_ORIGIN: 'https://1-2-3-4.sslip.io', EDGE_SECRET: 'segredo-de-teste' }

test('somente os prefixos do gateway vão para a AWS; o resto é a SPA', () => {
  for (const path of ['/api/core/stores', '/api', '/oauth2/authorization/google', '/login/oauth2/code/github', '/.well-known/jwks.json'])
    assert.equal(isProxied(path), true, path)
  for (const path of ['/', '/index.html', '/assets/app.js', '/apix', '/login', '/oauth2x'])
    assert.equal(isProxied(path), false, path)
})

test('a requisição para a origem leva caminho, query, segredo e IP real, sem confiar no cliente', async () => {
  const request = new Request('https://syndetis-web.example.workers.dev/api/core/orders?page=2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      [EDGE_SECRET_HEADER]: 'forjado',
      [CLIENT_IP_HEADER]: '10.0.0.1',
    },
    body: JSON.stringify({ ok: true }),
  })
  const forwarded = toOriginRequest(request, env)
  assert.equal(forwarded.url, 'https://1-2-3-4.sslip.io/api/core/orders?page=2')
  assert.equal(forwarded.method, 'POST')
  assert.equal(forwarded.redirect, 'manual')
  assert.equal(forwarded.headers.get(EDGE_SECRET_HEADER), 'segredo-de-teste')
  assert.equal(forwarded.headers.get(CLIENT_IP_HEADER), '203.0.113.7')
  assert.equal(forwarded.headers.get('Content-Type'), 'application/json')
  assert.deepEqual(await forwarded.json(), { ok: true })
})

test('configuração incompleta ou origem sem HTTPS é recusada', () => {
  const request = new Request('https://x.workers.dev/api/health')
  assert.throws(() => toOriginRequest(request, { ...env, EDGE_SECRET: '' }))
  assert.throws(() => toOriginRequest(request, { ...env, API_ORIGIN: 'http://1-2-3-4.sslip.io' }))
  assert.throws(() => toOriginRequest(request, { ...env, API_ORIGIN: 'https://1-2-3-4.sslip.io/api' }))
})

test('rotas da SPA vão para os assets e falha na origem vira 502 em português', async () => {
  const assets = { fetch: async () => new Response('spa') }
  const spa = await worker.fetch(new Request('https://x.workers.dev/modelos'), { ...env, ASSETS: assets })
  assert.equal(await spa.text(), 'spa')
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('offline') }
  try {
    const down = await worker.fetch(new Request('https://x.workers.dev/api/core/public/plans'), { ...env, ASSETS: assets })
    assert.equal(down.status, 502)
    assert.match((await down.json()).message, /indisponível/)
  } finally {
    globalThis.fetch = original
  }
})
