/**
 * The CNPJ of a store and the shape every Receita Federal lookup is reduced to. Merchant accounts are CNPJ only
 * (docs/architecture/adr/0006-lojista-somente-cnpj.md): a CPF is never looked up.
 */

export type TaxIdType = 'CNPJ';

/**
 * ACTIVE: exists and its situação cadastral is ATIVA.
 * INACTIVE: exists, but suspended, unfit (inapta), closed (baixada) or null.
 * NOT_FOUND: Receita Federal has no such number.
 */
export type TaxIdStatus = 'ACTIVE' | 'INACTIVE' | 'NOT_FOUND';

export interface TaxIdRecord {
  type: TaxIdType;
  /** Digits only. */
  document: string;
  status: TaxIdStatus;
  /** Receita Federal's own words for the registration status (e.g. "ATIVA", "BAIXADA"). */
  registrationStatus?: string;
  /** Razão social. */
  name?: string;
  tradeName?: string;
  /** True when the company is a MEI (opted into SIMEI). */
  mei?: boolean;
  legalNature?: string;
}

export const digits = (value: string) => value.replace(/\D/g, '');

function checkDigit(numbers: number[], weights: number[]): number {
  const sum = numbers.reduce((total, digit, index) => total + digit * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = digits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const numbers = Array.from(cnpj, Number);
  const first = checkDigit(numbers.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(numbers.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return numbers[12] === first && numbers[13] === second;
}

/** A JSON scalar as text; anything else (objects, null) is empty. */
export const scalar = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
