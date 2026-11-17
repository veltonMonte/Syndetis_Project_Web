/** CPF and CNPJ as a merchant types them: digits, mask and check digits (the Receita Federal confirms the rest). */

export const documentDigits = (value: string) => value.replace(/\D/g, '').slice(0, 14)

export function formatDocument(value: string): string {
  const d = documentDigits(value)
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, (_, a, b, c, e, f) => `${a}.${b}.${c}/${e}${f ? '-' + f : ''}`)
}

function checkDigit(numbers: number[], weights: number[]) {
  const rest = numbers.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(value: string): boolean {
  const d = documentDigits(value)
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  const n = Array.from(d, Number)
  return n[9] === checkDigit(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    n[10] === checkDigit(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
}

export function isValidCnpj(value: string): boolean {
  const d = documentDigits(value)
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false
  const n = Array.from(d, Number)
  return n[12] === checkDigit(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    n[13] === checkDigit(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
}

export type DocumentErrors = { document?: string; birthDate?: string }

/** What can be said before asking the Receita Federal. */
export function validateDocument(document: string, birthDate: string): DocumentErrors {
  const d = documentDigits(document)
  if (d.length === 11) {
    if (!isValidCpf(d)) return { document: 'Este CPF não é válido: confira os números.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Date.parse(birthDate) >= Date.now() || birthDate < '1900-01-01')
      return { birthDate: 'Informe a data de nascimento do titular do CPF.' }
    return {}
  }
  if (d.length === 14) return isValidCnpj(d) ? {} : { document: 'Este CNPJ não é válido: confira os números.' }
  return { document: 'Informe um CPF (11 dígitos) ou um CNPJ (14 dígitos).' }
}
