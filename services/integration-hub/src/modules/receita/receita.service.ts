import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { SerproCpfProvider } from './serpro-cpf.provider.js';
import { digits, isValidBirthDate, isValidCnpj, isValidCpf, type TaxIdRecord } from './tax-id.js';

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_LIMIT = 500;

/**
 * Checks a CPF or CNPJ against the Receita Federal. Definitive answers are kept for ten minutes, so the
 * signup form's check and the account creation right after it cost one billable SERPRO query, not two.
 */
@Injectable()
export class ReceitaService {
  private readonly cache = new Map<string, { record: TaxIdRecord; expiresAt: number }>();

  constructor(
    private readonly cnpj: BrasilApiCnpjProvider,
    private readonly cpf: SerproCpfProvider,
  ) {}

  async verify(rawDocument: string, birthDate?: string): Promise<TaxIdRecord> {
    const document = digits(rawDocument);
    if (document.length === 14) {
      if (!isValidCnpj(document)) throw new BadRequestException('CNPJ inválido: confira os números digitados.');
      return this.cached(`CNPJ:${document}`, () => this.cnpj.lookup(document));
    }
    if (document.length === 11) {
      if (!isValidCpf(document)) throw new BadRequestException('CPF inválido: confira os números digitados.');
      if (!birthDate || !isValidBirthDate(birthDate)) {
        throw new BadRequestException('Informe a data de nascimento do titular do CPF.');
      }
      return this.cached(`CPF:${document}:${birthDate}`, () => this.cpf.lookup(document, birthDate));
    }
    throw new BadRequestException('Informe um CPF (11 dígitos) ou um CNPJ (14 dígitos).');
  }

  private async cached(key: string, load: () => Promise<TaxIdRecord>): Promise<TaxIdRecord> {
    // Keys are hashed so the cache never holds a CPF and birth date in clear.
    const id = createHash('sha256').update(key).digest('hex');
    const hit = this.cache.get(id);
    if (hit && hit.expiresAt > Date.now()) return hit.record;
    const record = await load();
    if (this.cache.size >= CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(id, { record, expiresAt: Date.now() + CACHE_TTL_MS });
    return record;
  }
}
