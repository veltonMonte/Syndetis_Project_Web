import { timingSafeEqual } from 'node:crypto';
import { BadRequestException, Body, Controller, Headers, HttpCode, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Env } from '../../config/env.validation.js';
import { Public } from '../../middleware/auth/auth.decorators.js';
import { ReceitaService } from './receita.service.js';
import { digits, type TaxIdRecord } from './tax-id.js';

export class TaxIdLookupDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[\d.\-/\s]+$/, { message: 'Use apenas números, pontos, traços e barra.' })
  document: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a data no formato AAAA-MM-DD.' })
  birthDate?: string;
}

@ApiTags('receita')
@Public()
@Controller()
export class ReceitaController {
  constructor(
    private readonly receita: ReceitaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * The signup form's check of a CNPJ, before an account exists (rate-limited at the gateway). CNPJ data is
   * public. A CPF is personal data and each SERPRO query is billed, so a CPF is only checked when the
   * account is created.
   */
  @Post('tax-ids/lookup')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Situação do CNPJ na Receita Federal, com razão social e opção pelo MEI.' })
  async lookup(@Body() request: TaxIdLookupDto): Promise<TaxIdRecord> {
    if (digits(request.document).length !== 14) throw new BadRequestException('A consulta prévia aceita apenas CNPJ.');
    return this.receita.verify(request.document);
  }

  /** The auth-service's check before it creates or verifies a merchant account. */
  @Post('internal/tax-ids/verify')
  @HttpCode(200)
  async verify(@Headers('x-internal-token') token: string | undefined, @Body() request: TaxIdLookupDto): Promise<TaxIdRecord> {
    const expected = this.config.get('TAX_ID_INTERNAL_TOKEN', { infer: true });
    if (expected.length < 32) throw new ServiceUnavailableException('Verificação de documentos ainda não configurada.');
    const actual = Buffer.from(token ?? '');
    const secret = Buffer.from(expected);
    if (actual.length !== secret.length || !timingSafeEqual(actual, secret)) throw new UnauthorizedException();
    return this.receita.verify(request.document, request.birthDate);
  }
}
