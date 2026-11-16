import { parseWebhookSecrets, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('aplica padrões quando nada é informado', () => {
    const env = validateEnv({});
    expect(env.INTEGRATION_HUB_PORT).toBe(3001);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.CORE_EVENTS_ENABLED).toBe(true);
  });

  it('converte strings do ambiente', () => {
    const env = validateEnv({ INTEGRATION_HUB_PORT: '4000', CORE_EVENTS_ENABLED: 'false' });
    expect(env.INTEGRATION_HUB_PORT).toBe(4000);
    expect(env.CORE_EVENTS_ENABLED).toBe(false);
  });

  it('falha com valores inválidos', () => {
    expect(() => validateEnv({ SHIPPING_ORIGIN_ZIP: '123' })).toThrow(/SHIPPING_ORIGIN_ZIP/);
    expect(() => validateEnv({ INTEGRATION_HUB_PORT: '99999' })).toThrow(/INTEGRATION_HUB_PORT/);
  });
  it('exige segredos distintos e sandbox quando assinaturas estao habilitadas', () => {
    expect(() => validateEnv({ BILLING_ENABLED: 'true' })).toThrow(/Assinaturas exigem/);
    expect(() => validateEnv({ ASAAS_BASE_URL: 'https://api.asaas.com/v3' })).toThrow(/ASAAS_BASE_URL/);
    expect(() => validateEnv({ BILLING_ENABLED: 'invalid' })).toThrow(/BILLING_ENABLED/);
    const settings = { BILLING_ENABLED: 'true', ASAAS_API_KEY: 'test-key',
      BILLING_INTERNAL_TOKEN: 'internal-token-at-least-32-characters', ASAAS_WEBHOOK_TOKEN: 'webhook-token-at-least-32-characters' };
    expect(validateEnv(settings).BILLING_ENABLED).toBe(true);
    expect(() => validateEnv({ ...settings, ASAAS_WEBHOOK_TOKEN: settings.BILLING_INTERNAL_TOKEN })).toThrow(/Assinaturas exigem/);
  });
});

describe('parseWebhookSecrets', () => {
  it('lê pares provedor:segredo e ignora entradas inválidas', () => {
    const secrets = parseWebhookSecrets('Payments:abc, correios:x:y ,semsegredo:, :orfao,lixo');
    expect([...secrets]).toEqual([
      ['payments', 'abc'],
      ['correios', 'x:y'],
    ]);
  });
});
