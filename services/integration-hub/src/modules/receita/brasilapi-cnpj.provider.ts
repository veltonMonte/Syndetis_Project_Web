import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { scalar, type TaxIdRecord } from './tax-id.js';

/** Natureza jurídica 213-5: "Empresário (Individual)", the legal form every MEI has. */
const INDIVIDUAL_ENTREPRENEUR = 2135;

/**
 * CNPJ lookup through BrasilAPI, which serves the Receita Federal's open CNPJ data
 * (situação cadastral, razão social, natureza jurídica and the SIMEI option).
 */
@Injectable()
export class BrasilApiCnpjProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async lookup(cnpj: string): Promise<TaxIdRecord> {
    const base = this.config.get('BRASILAPI_URL', { infer: true }).replace(/\/$/, '');
    let response: Response;
    try {
      // BrasilAPI's CDN refuses requests without a User-Agent (403); Node's fetch sends none.
      response = await fetch(`${base}/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'Syndetis-integration-hub' } });
    } catch {
      throw new ServiceUnavailableException('A consulta de CNPJ na Receita Federal não respondeu. Tente de novo em instantes.');
    }
    if (response.status === 404) return { type: 'CNPJ', document: cnpj, status: 'NOT_FOUND' };
    if (response.status === 400) throw new BadRequestException('CNPJ inválido.');
    if (!response.ok) throw new ServiceUnavailableException('A consulta de CNPJ na Receita Federal está indisponível. Tente de novo em instantes.');

    const data = (await response.json()) as Record<string, unknown>;
    if (scalar(data.cnpj) !== cnpj) throw new ServiceUnavailableException('A consulta de CNPJ retornou outro número.');
    const situation = Number(data.situacao_cadastral);
    const nature = Number(data.codigo_natureza_juridica);
    return {
      type: 'CNPJ',
      document: cnpj,
      // Situação cadastral 2 = ATIVA; 1 nula, 3 suspensa, 4 inapta, 8 baixada.
      status: situation === 2 ? 'ACTIVE' : 'INACTIVE',
      registrationStatus: text(data.descricao_situacao_cadastral),
      name: text(data.razao_social),
      tradeName: text(data.nome_fantasia),
      mei: data.opcao_pelo_mei === true && nature === INDIVIDUAL_ENTREPRENEUR,
      legalNature: text(data.natureza_juridica),
    };
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;
}
