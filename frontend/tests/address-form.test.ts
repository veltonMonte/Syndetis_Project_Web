import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { EMPTY_ADDRESS, formatZipCode, toAddressPayload, validateAddress } from '../src/lib/address-form.ts'

const valid = { name: 'Ana Souza', phone: '(11) 99999-0000', zipCode: '01001-000', state: 'sp', street: 'Rua A', number: '10', complement: '', city: 'São Paulo' }

test('CEP ganha a máscara enquanto a pessoa digita', () => {
  assert.equal(formatZipCode('01001000'), '01001-000')
  assert.equal(formatZipCode('0100'), '0100')
  assert.equal(formatZipCode('01001-0009999abc'), '01001-000')
})

test('endereço válido passa e é enviado limpo', () => {
  assert.deepEqual(validateAddress(valid), {})
  assert.deepEqual(toAddressPayload({ ...valid, name: '  Ana Souza ' }), {
    customer: { name: 'Ana Souza', phone: '(11) 99999-0000' },
    address: { zipCode: '01001000', street: 'Rua A', number: '10', complement: '', city: 'São Paulo', state: 'SP' },
  })
  // What the checkout test types, without mask or punctuation, is still valid.
  assert.deepEqual(validateAddress({ ...valid, phone: '11999990000', zipCode: '01001000', state: 'SP' }), {})
})

test('cada campo inválido recebe a própria mensagem; complemento é opcional', () => {
  const errors = validateAddress(EMPTY_ADDRESS)
  assert.deepEqual(Object.keys(errors).sort(), ['city', 'name', 'number', 'phone', 'state', 'street', 'zipCode'])
  assert.match(validateAddress({ ...valid, zipCode: '123' }).zipCode ?? '', /8 números/)
  assert.match(validateAddress({ ...valid, state: 'XX' }).state ?? '', /sigla/)
  assert.match(validateAddress({ ...valid, phone: '9999' }).phone ?? '', /DDD/)
})
