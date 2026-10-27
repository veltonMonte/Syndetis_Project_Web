import { ConfigService } from '@nestjs/config';
import type { Queue, Job } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { BillingController, type BillingJob } from './billing.controller.js';
import { BillingProcessor } from './billing.processor.js';
import { AsaasProvider } from './asaas.provider.js';

const internal = 'internal-test-secret-at-least-32-characters';
const webhook = 'webhook-test-secret-at-least-32-characters';
const config = new ConfigService({ BILLING_ENABLED: true, BILLING_INTERNAL_TOKEN: internal,
  ASAAS_WEBHOOK_TOKEN: webhook, CORE_SERVICE_URL: 'http://core:8082' } as Env);
const add = vi.fn().mockResolvedValue({ id: 'job' });
const provider = { create: vi.fn(), snapshot: vi.fn(), cancel: vi.fn(), subscriptionForPayment: vi.fn() };
const controller = new BillingController(provider as unknown as AsaasProvider, config, { add } as unknown as Queue<BillingJob>);
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('Asaas webhooks e fronteira interna', () => {
  it('autentica antes de enfileirar e usa somente o identificador do pagamento', async () => {
    const body = { id: 'evt_test', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_test', value: 0.01, status: 'RECEIVED' } };
    await expect(controller.webhook('forged', body)).rejects.toThrow(); expect(add).not.toHaveBeenCalled();
    await expect(controller.webhook(webhook, body)).resolves.toEqual({ accepted: true });
    expect(add).toHaveBeenCalledWith('asaas', { eventId: 'evt_test', paymentId: 'pay_test' }, { jobId: 'evt_test' });
  });
  it('falha no ACK se a fila nao persistir e permite repeticao pelo Asaas', async () => {
    add.mockRejectedValueOnce(new Error('redis unavailable'));
    await expect(controller.webhook(webhook, { id: 'evt_retry', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_test' } })).rejects.toThrow('redis unavailable');
  });
  it('rejeita chamadas internas sem segredo', () => {
    expect(() => controller.sync('forged', 'sub_test')).toThrow(); expect(provider.snapshot).not.toHaveBeenCalled();
    void controller.sync(internal, 'sub_test'); expect(provider.snapshot).toHaveBeenCalledWith('sub_test');
  });
  it('consulta o provedor e repete processamento se o core falhar', async () => {
    const snapshot = { reference: '7b3cda7a-33f4-4f64-8eef-664b187d6ca5', providerId: 'sub_test', payments: [] };
    provider.subscriptionForPayment.mockResolvedValue('sub_test'); provider.snapshot.mockResolvedValue(snapshot);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 })); vi.stubGlobal('fetch', fetchMock);
    const worker = new BillingProcessor(provider as unknown as AsaasProvider, config);
    await expect(worker.process({ data: { eventId: 'evt_test', paymentId: 'pay_test' } } as Job<BillingJob>)).rejects.toThrow(/503/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(snapshot);
  });
});
