/** Validation of the delivery address a shopper types at checkout. Pure, so it is unit-tested. */

export interface AddressFields {
  name: string
  phone: string
  zipCode: string
  state: string
  street: string
  number: string
  complement: string
  city: string
}

export type AddressErrors = Partial<Record<keyof AddressFields, string>>

export const EMPTY_ADDRESS: AddressFields = {
  name: '', phone: '', zipCode: '', state: '', street: '', number: '', complement: '', city: '',
}

const STATES = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'])

const digits = (value: string) => value.replace(/\D/g, '')

/** 00000-000 while typing; extra characters are dropped. */
export function formatZipCode(value: string): string {
  const numbers = digits(value).slice(0, 8)
  return numbers.length > 5 ? numbers.slice(0, 5) + '-' + numbers.slice(5) : numbers
}

/** Field order is the order errors are focused in. */
export function validateAddress(fields: AddressFields): AddressErrors {
  const errors: AddressErrors = {}
  if (fields.name.trim().length < 2) errors.name = 'Informe o nome de quem vai receber.'
  const phone = digits(fields.phone)
  if (phone.length < 10 || phone.length > 13) errors.phone = 'Informe um telefone com DDD, como (11) 99999-0000.'
  if (digits(fields.zipCode).length !== 8) errors.zipCode = 'Informe os 8 números do CEP.'
  if (!STATES.has(fields.state.trim().toUpperCase())) errors.state = 'Informe a sigla do estado, como SP.'
  if (fields.street.trim().length < 2) errors.street = 'Informe a rua.'
  if (!fields.number.trim()) errors.number = 'Informe o número (ou "s/n").'
  if (fields.city.trim().length < 2) errors.city = 'Informe a cidade.'
  return errors
}

/** What the customer and address endpoints receive: trimmed, with CEP as digits and UF uppercased. */
export function toAddressPayload(fields: AddressFields) {
  return {
    customer: { name: fields.name.trim(), phone: fields.phone.trim() },
    address: {
      zipCode: digits(fields.zipCode),
      street: fields.street.trim(),
      number: fields.number.trim(),
      complement: fields.complement.trim(),
      city: fields.city.trim(),
      state: fields.state.trim().toUpperCase(),
    },
  }
}
