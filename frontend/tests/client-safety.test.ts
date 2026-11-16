import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { isHttpUrl, isSafeImageSrc } from '../src/lib/safe-url.ts'
import { parseStoredCart } from '../src/lib/stored-cart.ts'

test('links de lojista só são aceitos como http(s) absolutos', () => {
  for (const ok of ['https://loja.example/colecao', 'HTTP://example.com']) assert.equal(isHttpUrl(ok), true, ok)
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', '//evil.example', '/local', '', null, undefined, 'https://a b'])
    assert.equal(isHttpUrl(bad), false, String(bad))
})

test('imagens aceitam http(s) ou caminho local, nunca javascript:, data: ou //host', () => {
  for (const ok of ['https://img.example/a.webp', '/images/a.png', '/api/core/public/media/123']) assert.equal(isSafeImageSrc(ok), true, ok)
  for (const bad of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', '//evil.example/a.png', 'ftp://x/a.png', '', null])
    assert.equal(isSafeImageSrc(bad), false, String(bad))
})

const line = (over: Record<string, unknown> = {}, quantity: unknown = 2) => ({
  product: { id: 'p1', name: 'Camiseta', price: 39.9, sku: 'CAM', description: null, imageUrl: null, ...over },
  quantity,
})

test('sacola salva válida é restaurada como estava', () => {
  const restored = parseStoredCart(JSON.stringify([line(), line({ id: 'p2', name: 'Caneca', available: 3 }, 1)]))
  assert.equal(restored.length, 2)
  assert.deepEqual(restored[0], { product: { id: 'p1', name: 'Camiseta', price: 39.9, sku: 'CAM', description: null, imageUrl: null, categoryId: null }, quantity: 2 })
  assert.equal(restored[1].product.available, 3)
})

test('conteúdo adulterado ou inválido é descartado sem quebrar a página', () => {
  for (const raw of [null, '', 'não é json', '{"a":1}', '"texto"', '[null, 5, "x", {}]']) assert.deepEqual(parseStoredCart(raw), [])
  const mixed = parseStoredCart(JSON.stringify([
    line({ price: -1 }), line({ price: 'grátis' }), line({ name: '' }), line({ id: 7 }),
    line({}, 0), line({}, 1.5), line({}, '2'),
    line({ id: 'ok', name: { toString: 'x' } }),
    line({ id: 'bom' }, 500),
    line({ id: 'bom' }, 1),
  ]))
  assert.equal(mixed.length, 1, 'só a linha válida fica, sem duplicar o produto')
  assert.equal(mixed[0].product.id, 'bom')
  assert.equal(mixed[0].quantity, 99, 'quantidade limitada ao teto da sacola')
})
