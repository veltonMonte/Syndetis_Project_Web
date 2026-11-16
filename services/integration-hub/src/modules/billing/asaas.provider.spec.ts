import { ConfigService } from '@nestjs/config';
import { AsaasProvider } from './asaas.provider.js';
import type { Env } from '../../config/env.validation.js';

const reference = '7b3cda7a-33f4-4f64-8eef-664b187d6ca5';
const subscription = { id: 'sub_test', customer: 'cus_test', externalReference: reference, status: 'ACTIVE', value: 29.9, cycle: 'MONTHLY' };
const payment = { id: 'pay_test', subscription: 'sub_test', customer: 'cus_test', status: 'RECEIVED', value: 29.9, dueDate: '2026-10-27', invoiceUrl: 'https://sandbox.asaas.com/i/test' };
const fakeFetch = vi.fn();
const provider = new AsaasProvider(new ConfigService({ BILLING_ENABLED: true, ASAAS_API_KEY: 'test-key',
  ASAAS_BASE_URL: 'https://api-sandbox.asaas.com/v3' } as Env));
beforeEach(() => { fakeFetch.mockReset(); vi.stubGlobal('fetch', fakeFetch); });
afterEach(() => vi.unstubAllGlobals());
const jsonResponse = (value: unknown) => Response.json(value);

describe('AsaasProvider', () => {
  it('recupera a assinatura por referencia antes de repetir uma criacao inconclusiva', async () => {
    fakeFetch.mockResolvedValueOnce(jsonResponse({ data: [subscription], hasMore: false }))
      .mockResolvedValueOnce(jsonResponse(subscription)).mockResolvedValueOnce(jsonResponse({ data: [payment], hasMore: false }));
    const result = await provider.create({ reference, name: 'Lojista', email: 'seller@example.test', cpfCnpj: '12345678909', planName: 'Standard', amount: 29.9 });
    expect(result.providerId).toBe('sub_test'); expect(result.payments).toHaveLength(1);
    expect(fakeFetch.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
    expect(fakeFetch.mock.calls[0][1].headers.access_token).toBe('test-key');
  });
  it('cria cliente e assinatura mensal sem enviar dados de cartao', async () => {
    fakeFetch.mockResolvedValueOnce(jsonResponse({ data: [], hasMore: false }))
      .mockResolvedValueOnce(jsonResponse({ data: [], hasMore: false })).mockResolvedValueOnce(jsonResponse({ id: 'cus_test' }))
      .mockResolvedValueOnce(jsonResponse(subscription)).mockResolvedValueOnce(jsonResponse(subscription))
      .mockResolvedValueOnce(jsonResponse({ data: [], hasMore: false }));
    await provider.create({ reference, name: 'Lojista', email: 'seller@example.test', cpfCnpj: '12345678909', planName: 'Standard', amount: 29.9 });
    const body = JSON.parse(fakeFetch.mock.calls[3][1].body);
    expect(body).toMatchObject({ cycle: 'MONTHLY', billingType: 'UNDEFINED', value: 29.9, externalReference: reference });
    expect(body.creditCard).toBeUndefined();
  });
  it('rejeita fatura externa e cobranca de outra assinatura', async () => {
    fakeFetch.mockResolvedValueOnce(jsonResponse(subscription)).mockResolvedValueOnce(jsonResponse({ data: [{ ...payment, invoiceUrl: 'https://attacker.example/pay' }], hasMore: false }));
    await expect(provider.snapshot('sub_test')).rejects.toThrow(/URL/);
    fakeFetch.mockResolvedValueOnce(jsonResponse(subscription)).mockResolvedValueOnce(jsonResponse({ data: [{ ...payment, subscription: 'sub_other' }], hasMore: false }));
    await expect(provider.snapshot('sub_test')).rejects.toThrow(/incompatível/);
  });
  it('nao aceita falha de paginacao como historico completo', async () => {
    fakeFetch.mockResolvedValueOnce(jsonResponse(subscription)).mockResolvedValueOnce(jsonResponse({ data: [], hasMore: true }));
    await expect(provider.snapshot('sub_test')).rejects.toThrow(/Paginação/);
  });
  it('nao expõe erro externo nem permite producao nesta entrega', async () => {
    fakeFetch.mockResolvedValue(new Response('sensitive provider response', { status: 401 }));
    await expect(provider.snapshot('sub_test')).rejects.toThrow('Asaas indisponível');
    const production = new AsaasProvider(new ConfigService({ BILLING_ENABLED: true, ASAAS_API_KEY: 'test', ASAAS_BASE_URL: 'https://api.asaas.com/v3' } as Env));
    await expect(production.snapshot('sub_test')).rejects.toThrow(/Sandbox/);
  });
  it('cancelamento pode ser repetido apos retorno perdido', async () => {
    fakeFetch.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(provider.cancel('sub_test')).resolves.toBeUndefined();
  });
});
