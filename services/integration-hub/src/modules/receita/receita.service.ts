import { BadRequestException, Injectable } from '@nestjs/common';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { digits, isValidCnpj, type TaxIdRecord } from './tax-id.js';

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_LIMIT = 500;

/**
 * Checks a store's CNPJ against the Receita Federal (BrasilAPI). Merchant accounts are CNPJ only, as a fraud
 * barrier; a CPF is refused before any query. Definitive answers are kept for ten minutes, so the signup form's
 * check and the account creation right after it make one query, not two.
 */
@Injectable()
export class ReceitaService {
  private readonly cache = new Map<string, { record: TaxIdRecord; expiresAt: number }>();

  constructor(private readonly cnpj: BrasilApiCnpjProvider) {}

  async verify(rawDocument: string): Promise<TaxIdRecord> {
    const document = digits(rawDocument);
    if (document.length === 11) throw new BadRequestException('Contas de lojista usam o CNPJ da loja, não CPF.');
    if (document.length !== 14) throw new BadRequestException('Informe o CNPJ da loja (14 dígitos).');
    if (!isValidCnpj(document)) throw new BadRequestException('CNPJ inválido: confira os números digitados.');
    const hit = this.cache.get(document);
    if (hit && hit.expiresAt > Date.now()) return hit.record;
    const record = await this.cnpj.lookup(document);
    if (this.cache.size >= CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(document, { record, expiresAt: Date.now() + CACHE_TTL_MS });
    return record;
  }
}
