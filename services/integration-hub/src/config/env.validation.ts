import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Variáveis de ambiente aceitas pelo integration-hub.
 * A aplicação não sobe se alguma estiver inválida.
 */
export class Env {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  INTEGRATION_HUB_PORT = 3001;

  @IsString()
  @MinLength(1)
  REDIS_HOST = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsUrl({ require_tld: false })
  JWT_JWKS_URI = 'http://localhost:8081/.well-known/jwks.json';

  @IsString()
  @MinLength(1)
  JWT_ISSUER = 'http://localhost:8081';

  @IsString()
  @MinLength(1)
  JWT_AUDIENCE = 'syndetis';

  @Transform(({ obj, value }) => {
    const raw = (obj as Record<string, unknown>).CORE_EVENTS_ENABLED;
    return raw === undefined ? value : raw === true || raw === 'true';
  })
  @IsBoolean()
  CORE_EVENTS_ENABLED = true;

  @IsString()
  @MinLength(1)
  CORE_EVENTS_STREAM = 'syndetis:core-events';

  @IsString()
  @MinLength(1)
  CORE_EVENTS_GROUP = 'integration-hub';

  /** CEP de origem padrão para cotações de frete (8 dígitos). */
  @Matches(/^\d{8}$/)
  SHIPPING_ORIGIN_ZIP = '01001000';

  /**
   * Segredos HMAC por provedor de webhook, no formato `provedor:segredo,outro:segredo`.
   * Provedores sem segredo configurado são rejeitados com 404.
   */
  @IsString()
  WEBHOOK_SECRETS = '';

  @IsString()
  PAYMENTS_INTERNAL_TOKEN = '';

  @IsString()
  MP_ACCESS_TOKEN = '';

  @IsString()
  MP_WEBHOOK_SECRET = '';

  /**
   * The Syndetis application on Mercado Pago (Suas integrações > Credenciais). With it, each merchant connects
   * their own account through OAuth and payments go straight to them; the redirect URL registered there must be
   * PUBLIC_ORIGIN + /api/core/public/payments/mercadopago/callback.
   */
  @IsString()
  MP_CLIENT_ID = '';

  @IsString()
  MP_CLIENT_SECRET = '';

  @Transform(({ obj, value }) => {
    const raw = (obj as Record<string, unknown>).BILLING_ENABLED;
    return raw === undefined ? value : raw === 'true' || raw === true ? true : raw === 'false' || raw === false ? false : raw;
  })
  @IsBoolean()
  BILLING_ENABLED = false;

  // Esta primeira entrega aceita apenas Sandbox; produção exige homologação.
  @Matches(/^https:\/\/api-sandbox\.asaas\.com\/v3$/)
  ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

  @IsString()
  ASAAS_API_KEY = '';

  @IsString()
  ASAAS_WEBHOOK_TOKEN = '';

  @IsString()
  BILLING_INTERNAL_TOKEN = '';

  @Transform(({ obj, value }) => {
    const raw = (obj as Record<string, unknown>).MP_SANDBOX;
    if (raw === undefined) return value;
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return raw;
  })
  @IsBoolean()
  MP_SANDBOX = true;

  @IsUrl({ require_tld: false })
  PUBLIC_ORIGIN = 'http://localhost:8080';

  @IsUrl({ require_tld: false })
  CORE_SERVICE_URL = 'http://localhost:8082';

  /** BrasilAPI: dados abertos de CNPJ da Receita Federal (situação cadastral, razão social, MEI). */
  @IsUrl({ require_tld: false })
  BRASILAPI_URL = 'https://brasilapi.com.br/api';

  /**
   * Consulta CPF v3 da SERPRO (CPF + data de nascimento). O padrão é o ambiente de demonstração gratuito;
   * com contrato, use https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v3 e as chaves do contrato.
   */
  @IsUrl({ require_tld: false })
  SERPRO_CPF_URL = 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/v3';

  @IsUrl({ require_tld: false })
  SERPRO_TOKEN_URL = 'https://gateway.apiserpro.serpro.gov.br/token';

  /** Token fixo (o ambiente de demonstração usa um); sem ele, as chaves do contrato geram um token por hora. */
  @IsString()
  SERPRO_ACCESS_TOKEN = '';

  @IsString()
  SERPRO_CONSUMER_KEY = '';

  @IsString()
  SERPRO_CONSUMER_SECRET = '';

  /** Segredo compartilhado com o auth-service para POST /internal/tax-ids/verify (mínimo 32 caracteres). */
  @IsString()
  TAX_ID_INTERNAL_TOKEN = '';
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Configuração inválida do integration-hub:\n${details}`);
  }
  if (env.BILLING_ENABLED && (!env.ASAAS_API_KEY || env.BILLING_INTERNAL_TOKEN.length < 32 ||
      !/^\S{32,255}$/.test(env.ASAAS_WEBHOOK_TOKEN) || env.ASAAS_WEBHOOK_TOKEN === env.ASAAS_API_KEY ||
      env.BILLING_INTERNAL_TOKEN === env.ASAAS_WEBHOOK_TOKEN)) {
    throw new Error('Assinaturas exigem ASAAS_API_KEY e dois segredos distintos: BILLING_INTERNAL_TOKEN e ASAAS_WEBHOOK_TOKEN (mínimo 32 caracteres).');
  }
  return env;
}

export function parseWebhookSecrets(value: string): Map<string, string> {
  const secrets = new Map<string, string>();
  for (const entry of value.split(',')) {
    const separator = entry.indexOf(':');
    if (separator <= 0) continue;
    const provider = entry.slice(0, separator).trim().toLowerCase();
    const secret = entry.slice(separator + 1).trim();
    if (provider && secret) secrets.set(provider, secret);
  }
  return secrets;
}
