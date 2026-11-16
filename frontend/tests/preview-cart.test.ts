import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { addPreviewLine, previewSubtotal, setPreviewQuantity } from '../src/lib/preview-cart.ts'
const product = { id: 'p1', name: 'Produto', slug: 'produto', categoryId: '', price: 0.1, stock: 3, sku: '', image: '', featured: false }

test('as mesmas escolhas se juntam e escolhas diferentes criam linhas separadas', () => {
  let lines = addPreviewLine([], product, { Variação: 'A', Cor: 'Clara' })
  lines = addPreviewLine(lines, product, { Cor: 'Clara', Variação: 'A' })
  lines = addPreviewLine(lines, product, { Variação: 'B', Cor: 'Clara' })
  assert.equal(lines.length, 2)
  assert.deepEqual(lines.map(line => line.quantity), [2, 1])
})
test('o limite do estoque é compartilhado entre variações', () => {
  let lines = addPreviewLine([], product, { Variação: 'A' })
  lines = addPreviewLine(lines, product, { Variação: 'B' })
  lines = setPreviewQuantity(lines, lines[0].key, 100)
  assert.deepEqual(lines.map(line => line.quantity), [2, 1])
  assert.equal(addPreviewLine(lines, product, { Variação: 'C' }).length, 2)
  assert.deepEqual(addPreviewLine([], { ...product, stock: 0 }), [])
})
test('remover libera o estoque e totais são calculados em centavos', () => {
  let lines = addPreviewLine([], product)
  lines = setPreviewQuantity(lines, lines[0].key, 3)
  assert.equal(previewSubtotal(lines), 0.3)
  lines = setPreviewQuantity(lines, lines[0].key, 0)
  assert.deepEqual(lines, [])
  assert.equal(addPreviewLine(lines, product).length, 1)
})
