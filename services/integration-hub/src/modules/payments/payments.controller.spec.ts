import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { Env } from '../../config/env.validation.js';
import type { PaymentProvider } from './payment.provider.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsProcessor } from './payments.processor.js';

const internalToken = 'test-only-internal-token-with-at-least-32-characters';
const secret = 'test-webhook-secret';
const config = new ConfigService<Env, true>(Object.assign(new Env(), {
  PAYMENTS_INTERNAL_TOKEN: internalToken, MP_WEBHOOK_SECRET: secret,
}));
const provider = { createCheckout: vi.fn(), getPayment: vi.fn(), findPayments: vi.fn() } satisfies PaymentProvider;
const queue = { add: vi.fn() };
const controller = new PaymentsController(provider, queue as unknown as Queue<{ paymentId: string }>, config);

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
describe('Fronteiras de confiança do pagamento', () => {
  it('não permite criar checkout com token público, ausente ou adulterado', async () => {
    const request = { orderId: 'order', requestId: 'request', amount: 10, email: 'a@example.com', expiresAt: new Date().toISOString() };
    await expect(controller.create(undefined, request)).rejects.toThrow();
    await expect(controller.create('Bearer public-jwt', request)).rejects.toThrow();
    expect(provider.createCheckout).not.toHaveBeenCalled();
    await controller.create(internalToken, request);
    expect(provider.createCheckout).toHaveBeenCalledWith(request);
  });
  it('só enfileira o identificador validado pela assinatura do Mercado Pago', async () => {
    const ts = String(Date.now());
    const manifest = `id:123;request-id:request;ts:${ts};`;
    const digest = createHmac('sha256', secret).update(manifest).digest('hex');
    await controller.webhook('123', 'payment', 'request', `ts=${ts},v1=${digest}`);
    expect(queue.add).toHaveBeenCalledWith('mercadopago', { paymentId: '123' });
    queue.add.mockClear();
    await expect(controller.webhook('999', 'payment', 'request', `ts=${ts},v1=${digest}`)).rejects.toThrow();
    expect(queue.add).not.toHaveBeenCalled();
  });
  it('consulta o provedor antes de notificar o core e mantém o erro para retry', async () => {
    const payment = { paymentId: '123', orderId: 'order', status: 'approved', amount: 49.9, currency: 'BRL', liveMode: false };
    vi.mocked(provider.getPayment).mockResolvedValue(payment);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const processor = new PaymentsProcessor(provider, config);
    const job = { data: { paymentId: '123' } } as Parameters<typeof processor.process>[0];
    await processor.process(job);
    expect(provider.getPayment).toHaveBeenCalledWith('123');
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual(payment);
    expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'X-Internal-Token': internalToken });
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(processor.process(job)).rejects.toThrow('Confirmação de pagamento indisponível');
  });
});
