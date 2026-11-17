/** Brazilian taxpayer numbers (CPF, CNPJ) and the shape every Receita Federal lookup is reduced to. */

export type TaxIdType = 'CPF' | 'CNPJ';

/**
 * ACTIVE: exists and is regular (CPF "REGULAR", CNPJ "ATIVA").
 * INACTIVE: exists, but suspended, closed, cancelled or the holder died.
 * NOT_FOUND: Receita Federal has no such number.
 * BIRTH_DATE_MISMATCH: the CPF exists, but not with that date of birth.
 * UNDERAGE: the CPF belongs to someone under 18; SERPRO does not return their data.
 */
export type TaxIdStatus = 'ACTIVE' | 'INACTIVE' | 'NOT_FOUND' | 'BIRTH_DATE_MISMATCH' | 'UNDERAGE';

export interface TaxIdRecord {
  type: TaxIdType;
  /** Digits only. */
  document: string;
  status: TaxIdStatus;
  /** Receita Federal's own words for the registration status (e.g. "ATIVA", "SUSPENSA"). */
  registrationStatus?: string;
  /** CNPJ: razão social. CPF: the holder's name (only ever returned to internal callers). */
  name?: string;
  tradeName?: string;
  /** CNPJ only: true when the company is a MEI (opted into SIMEI). */
  mei?: boolean;
  legalNature?: string;
}

export const digits = (value: string) => value.replace(/\D/g, '');

function checkDigit(numbers: number[], weights: number[]): number {
  const sum = numbers.reduce((total, digit, index) => total + digit * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(value: string): boolean {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const numbers = Array.from(cpf, Number);
  const first = checkDigit(numbers.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(numbers.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return numbers[9] === first && numbers[10] === second;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = digits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const numbers = Array.from(cnpj, Number);
  const first = checkDigit(numbers.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(numbers.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return numbers[12] === first && numbers[13] === second;
}

/** A real calendar date (YYYY-MM-DD) in the past, after 1900. */
export function isValidBirthDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day &&
    year >= 1900 && date.getTime() < Date.now();
}

/** A JSON scalar as text; anything else (objects, null) is empty. */
export const scalar = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
