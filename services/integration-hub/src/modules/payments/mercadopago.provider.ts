import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import type { CheckoutRequest, CheckoutResponse, ConfirmedPayment, PaymentProvider } from './payment.provider.js';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    const origin = this.config.get('PUBLIC_ORIGIN', { infer: true });
    if (new URL(origin).protocol !== 'https:') {
      throw new ServiceUnavailableException('Configure uma origem pública HTTPS para o pagamento.');
    }
    if (Date.parse(request.expiresAt) <= Date.now()) throw new ServiceUnavailableException('A reserva expirou.');
    const returnUrl = `${origin}/pedidos/${request.orderId}`;
    const result = await this.call('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        external_reference: request.orderId,
        items: [{ id: request.orderId, title: 'Pedido Syndetis', quantity: 1,
          currency_id: 'BRL', unit_price: request.amount }],
        payer: { email: request.email },
        back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
        auto_return: 'approved',
        notification_url: `${origin}/api/payments/webhooks/mercadopago`,
        expires: true,
        expiration_date_to: request.expiresAt,
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }] },
        metadata: { checkout_request_id: request.requestId },
      }),
    });
    const url = new URL(stringField(result, 'init_point'));
    if (url.protocol !== 'https:' || !['www.mercadopago.com.br', 'www.mercadopago.com',
      'sandbox.mercadopago.com.br', 'sandbox.mercadopago.com'].includes(url.hostname)) {
      throw new ServiceUnavailableException('O provedor retornou uma URL de pagamento inválida.');
    }
    return { preferenceId: stringField(result, 'id'), checkoutUrl: url.href };
  }

  async getPayment(id: string): Promise<ConfirmedPayment> {
    if (!/^\d{1,100}$/.test(id)) throw new Error('Identificador de pagamento inválido.');
    const result = await this.call(`/v1/payments/${id}`);
    const payment = parsePayment(result);
    if (payment.paymentId !== id) throw new Error('Resposta de pagamento inválida.');
    return payment;
  }

  private async call(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
    const token = this.config.get('MP_ACCESS_TOKEN', { infer: true });
    if (!token) throw new ServiceUnavailableException('Mercado Pago ainda não configurado.');
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      ...options, signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new ServiceUnavailableException('Mercado Pago temporariamente indisponível.');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Resposta de pagamento inválida.');
    return result as Record<string, unknown>;
  }

  async findPayments(orderId: string): Promise<ConfirmedPayment[]> {
    const result = await this.call(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=50`);
    if (!Array.isArray(result.results)) throw new Error('Consulta de pagamentos inválida.');
    const confirmed = result.results.map(parsePayment);
    return confirmed.filter((payment) => payment.orderId === orderId);
  }
}

function parsePayment(value: unknown): ConfirmedPayment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta de pagamento inválida.');
  const result = value as Record<string, unknown>;
  const id = String(result.id);
  if (!/^\d{1,100}$/.test(id) || typeof result.transaction_amount !== 'number' ||
      !Number.isFinite(result.transaction_amount) || result.transaction_amount < 0 ||
      typeof result.live_mode !== 'boolean') throw new Error('Resposta de pagamento inválida.');
  return { paymentId: id, orderId: stringField(result, 'external_reference'), status: stringField(result, 'status'),
    amount: result.transaction_amount, currency: stringField(result, 'currency_id'), liveMode: result.live_mode };
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Campo de pagamento inválido: ${field}`);
  return value;
}
