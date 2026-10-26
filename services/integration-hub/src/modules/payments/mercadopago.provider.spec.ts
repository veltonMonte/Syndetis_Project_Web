import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';
import { MercadoPagoProvider } from './mercadopago.provider.js';

const orderId = '50dbe962-04c4-4db3-b729-b7f070a6a6ec';
const config = new ConfigService<Env, true>(Object.assign(new Env(), { MP_ACCESS_TOKEN: 'test-only', PUBLIC_ORIGIN: 'https://test.example.com' }));
const provider = new MercadoPagoProvider(config);
const fakeFetch = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fakeFetch); fakeFetch.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Mercado Pago — contrato externo', () => {
  it('cria preferência com valor fornecido pelo core, referência, vencimento e URLs fixas', async () => {
    fakeFetch.mockResolvedValue(Response.json({ id: 'preference', init_point: 'https://www.mercadopago.com.br/checkout/start?pref_id=test' }));
    const result = await provider.createCheckout({ orderId, requestId: orderId, amount: 59.9, email: 'buyer@example.com', expiresAt: new Date(Date.now() + 60000).toISOString() });
    expect(result.preferenceId).toBe('preference');
    const options = fakeFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.external_reference).toBe(orderId);
    expect(body.items).toEqual([{ id: orderId, title: 'Pedido Syndetis', quantity: 1, currency_id: 'BRL', unit_price: 59.9 }]);
    expect(body.notification_url).toBe('https://test.example.com/api/payments/webhooks/mercadopago');
    expect(body.expires).toBe(true);
  });
  it('rejeita redirecionamento para origem não autorizada', async () => {
    fakeFetch.mockResolvedValue(Response.json({ id: 'preference', init_point: 'https://attacker.example/pay' }));
    await expect(provider.createCheckout({ orderId, requestId: orderId, amount: 10, email: 'buyer@example.com', expiresAt: new Date(Date.now() + 60000).toISOString() })).rejects.toThrow();
  });
  it('consulta o pagamento no provedor e valida identificador e valor', async () => {
    fakeFetch.mockResolvedValue(Response.json({ id: 123, transaction_amount: 59.9, live_mode: false, external_reference: orderId, status: 'approved', currency_id: 'BRL' }));
    expect(await provider.getPayment('123')).toEqual({ paymentId: '123', orderId, status: 'approved', amount: 59.9, currency: 'BRL', liveMode: false });
    fakeFetch.mockResolvedValue(Response.json({ id: 999, transaction_amount: 59.9, live_mode: false }));
    await expect(provider.getPayment('123')).rejects.toThrow();
  });
  it('falha sem expor credenciais ou mensagem do provedor', async () => {
    fakeFetch.mockResolvedValue(new Response('secret provider detail', { status: 500 }));
    await expect(provider.getPayment('123')).rejects.toThrow('Mercado Pago temporariamente indisponível.');
  });
});
