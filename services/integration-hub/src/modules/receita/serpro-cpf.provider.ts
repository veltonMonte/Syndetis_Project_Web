import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { scalar, type TaxIdRecord } from './tax-id.js';

/**
 * CPF lookup through SERPRO's "Consulta CPF" v3, the Receita Federal's official channel. A query takes the
 * CPF and the holder's date of birth. Credentials are either a contract's consumer key and secret
 * (exchanged for an hour-long token) or a fixed bearer token, as the free trial environment uses.
 */
@Injectable()
export class SerproCpfProvider {
  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: ConfigService<Env, true>) {}

  get configured(): boolean {
    return !!(this.config.get('SERPRO_ACCESS_TOKEN', { infer: true }) ||
      (this.config.get('SERPRO_CONSUMER_KEY', { infer: true }) && this.config.get('SERPRO_CONSUMER_SECRET', { infer: true })));
  }

  /** @param birthDate YYYY-MM-DD */
  async lookup(cpf: string, birthDate: string): Promise<TaxIdRecord> {
    if (!this.configured) {
      throw new ServiceUnavailableException('A verificação de CPF ainda não está configurada. Use um CNPJ ou tente mais tarde.');
    }
    const [year, month, day] = birthDate.split('-');
    let response = await this.query(cpf, `${day}${month}${year}`);
    if (response.status === 401 && !this.config.get('SERPRO_ACCESS_TOKEN', { infer: true })) {
      this.token = undefined;
      response = await this.query(cpf, `${day}${month}${year}`);
    }
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    switch (response.status) {
      case 200:
      case 206: {
        if (scalar(data.ni) !== cpf) throw new ServiceUnavailableException('A consulta de CPF retornou outro número.');
        const situation = data.situacao as { codigo?: unknown; descricao?: unknown } | undefined;
        return {
          type: 'CPF',
          document: cpf,
          // Situação 0 = REGULAR; 2 suspensa, 3 titular falecido, 4 pendente, 5 cancelada, 8 nula, 9 cancelada de ofício.
          status: scalar(situation?.codigo) === '0' ? 'ACTIVE' : 'INACTIVE',
          registrationStatus: typeof situation?.descricao === 'string' ? situation.descricao : undefined,
          name: typeof data.nomeSocial === 'string' && data.nomeSocial.trim() ? data.nomeSocial.trim()
            : typeof data.nome === 'string' ? data.nome.trim() : undefined,
        };
      }
      case 404:
        return { type: 'CPF', document: cpf, status: data.erro === 'DATA_NASCIMENTO_DIVERGENTE' ? 'BIRTH_DATE_MISMATCH' : 'NOT_FOUND' };
      case 422:
      case 451:
        return { type: 'CPF', document: cpf, status: 'UNDERAGE' };
      case 400:
        throw new BadRequestException(data.erro === 'DATA_NASCIMENTO_INVALIDA' ? 'Data de nascimento inválida.' : 'CPF inválido.');
      default:
        throw new ServiceUnavailableException('A consulta de CPF na Receita Federal está indisponível. Tente de novo em instantes.');
    }
  }

  private async query(cpf: string, birth: string): Promise<Response> {
    const base = this.config.get('SERPRO_CPF_URL', { infer: true }).replace(/\/$/, '');
    try {
      return await fetch(`${base}/cpf/${cpf}/${birth}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', Authorization: `Bearer ${await this.bearer()}` },
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('A consulta de CPF na Receita Federal não respondeu. Tente de novo em instantes.');
    }
  }

  private async bearer(): Promise<string> {
    const fixed = this.config.get('SERPRO_ACCESS_TOKEN', { infer: true });
    if (fixed) return fixed;
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const key = this.config.get('SERPRO_CONSUMER_KEY', { infer: true });
    const secret = this.config.get('SERPRO_CONSUMER_SECRET', { infer: true });
    const response = await fetch(this.config.get('SERPRO_TOKEN_URL', { infer: true }), {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    }).catch(() => undefined);
    const data = response?.ok ? ((await response.json()) as { access_token?: unknown; expires_in?: unknown }) : undefined;
    if (typeof data?.access_token !== 'string') throw new ServiceUnavailableException('Não foi possível autenticar na SERPRO.');
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000 };
    return this.token.value;
  }
}
