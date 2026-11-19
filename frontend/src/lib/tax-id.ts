/**
 * The store's CNPJ as a merchant types it: digits, mask and check digits (the Receita Federal confirms the rest).
 * The CNPJ is optional; a confirmed one earns the "Verificado Syndetis" badge. A CPF is never accepted.
 */

export const documentDigits = (value: string) => value.replace(/\D/g, '').slice(0, 14)

export function formatCnpj(value: string): string {
  const d = documentDigits(value)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function checkDigit(numbers: number[], weights: number[]) {
  const rest = numbers.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCnpj(value: string): boolean {
  const d = documentDigits(value)
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false
  const n = Array.from(d, Number)
  return n[12] === checkDigit(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    n[13] === checkDigit(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
}

export type DocumentErrors = { document?: string }

/** What can be said before asking the Receita Federal. An empty field is fine: the CNPJ is optional. */
export function validateDocument(document: string): DocumentErrors {
  const d = documentDigits(document)
  if (!d) return {}
  if (d.length === 11) return { document: 'Contas de lojista usam o CNPJ da loja, não CPF.' }
  if (d.length !== 14) return { document: 'Informe o CNPJ da loja (14 dígitos).' }
  return isValidCnpj(d) ? {} : { document: 'Este CNPJ não é válido: confira os números.' }
}
