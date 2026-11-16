import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { safeServerMessage } from '../src/lib/safe-message.ts'

test('erro inesperado do servidor nunca mostra o texto que veio na resposta', () => {
  const shown = safeServerMessage(500, { detail: 'NullPointerException at com.syndetis.core.OrderService:142' })
  assert.doesNotMatch(shown, /NullPointer|com\.syndetis/)
  assert.match(shown, /erro inesperado/)
})

test('explicações escritas para pessoas são mantidas, inclusive em 502/503', () => {
  assert.equal(safeServerMessage(422, { detail: 'Informe um preço maior que zero.' }), 'Informe um preço maior que zero.')
  assert.equal(safeServerMessage(503, { detail: 'A reserva expirou.' }), 'A reserva expirou.')
  assert.equal(safeServerMessage(400, { message: ['Nome obrigatório', 'E-mail inválido'] }), 'Nome obrigatório; E-mail inválido')
})

test('respostas sem texto útil, não textuais ou longas demais viram mensagem segura', () => {
  const generic = 'Não foi possível concluir a operação.'
  assert.equal(safeServerMessage(400, null), generic)
  assert.equal(safeServerMessage(400, { detail: { nested: true } }), generic)
  assert.equal(safeServerMessage(400, { detail: '   ' }), generic)
  const long = safeServerMessage(400, { detail: 'x'.repeat(5000) })
  assert.equal(long.length, 300)
  assert.equal(safeServerMessage(409, { detail: 'linha 1\n\n   linha 2' }), 'linha 1 linha 2')
})
