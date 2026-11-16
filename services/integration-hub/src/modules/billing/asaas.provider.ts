import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';

type RecordValue = Record<string, unknown>;
export interface BillingRequest {
  reference: string; name: string; email: string; cpfCnpj: string;
  planName: string; amount: number;
}
export interface BillingSnapshot {
  reference: string; providerId: string; customerId: string; providerStatus: string;
  amount: number; cycle: string; observedAt: string;
  payments: { id: string; status: string; amount: number; dueDate: string; invoiceUrl: string | null }[];
}
const providerId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^(sub|cus|pay)_[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Identificador Asaas inválido.');
  return value;
};
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta Asaas inválida.');
  return value as RecordValue;
}

@Injectable()
export class AsaasProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private async request(path: string, method = 'GET', body?: unknown, allowMissing = false): Promise<RecordValue | null> {
    if (!this.config.get('BILLING_ENABLED', { infer: true }) || !this.config.get('ASAAS_API_KEY', { infer: true })) {
      throw new ServiceUnavailableException('Assinaturas Asaas ainda não configuradas.');
    }
    const base = this.config.get('ASAAS_BASE_URL', { infer: true });
    if (base !== 'https://api-sandbox.asaas.com/v3') throw new ServiceUnavailableException('Use o Sandbox do Asaas.');
    try {
      const response = await fetch(base + path, {
        method, redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { access_token: this.config.get('ASAAS_API_KEY', { infer: true }),
          'Content-Type': 'application/json', 'User-Agent': 'Syndetis/0.1' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 404 && allowMissing) return null;
      // Não expor resposta do provedor: pode conter dados pessoais ou credenciais.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return object(await response.json());
    } catch {
      throw new ServiceUnavailableException('Asaas indisponível. Confira a configuração e tente novamente; sua solicitação será reutilizada.');
    }
  }

  private async list(path: string): Promise<RecordValue[]> {
    const result: RecordValue[] = [];
    for (let offset = 0; offset < 10000; offset += 100) {
      const page = await this.request(`${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`);
      if (!Array.isArray(page?.data)) throw new Error('Listagem Asaas inválida.');
      result.push(...page.data.map(object));
      if (page.hasMore === false) return result;
      if (page.hasMore !== true || page.data.length === 0) throw new Error('Paginação Asaas inválida.');
    }
    throw new Error('Conciliação excedeu o limite de páginas.');
  }

  async create(request: BillingRequest): Promise<BillingSnapshot> {
    // Recupera uma criação cujo retorno possa ter se perdido. O core serializa por loja.
    const reference = encodeURIComponent(request.reference);
    const existing = await this.list(`/subscriptions?externalReference=${reference}&includeDeleted=true`);
    if (existing.length > 1) throw new Error('Assinaturas duplicadas exigem conciliação.');
    let subscription = existing[0];
    if (!subscription) {
      const customers = await this.list(`/customers?externalReference=${reference}`);
      if (customers.length > 1) throw new Error('Clientes duplicados exigem conciliação.');
      const customer = customers[0] ?? await this.request('/customers', 'POST', {
        name: request.name, email: request.email, cpfCnpj: request.cpfCnpj, externalReference: request.reference,
      });
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      subscription = object(await this.request('/subscriptions', 'POST', {
        customer: providerId(customer?.id), billingType: 'UNDEFINED', value: request.amount,
        nextDueDate: today, cycle: 'MONTHLY', description: `Syndetis ${request.planName} — assinatura mensal da loja`,
        externalReference: request.reference,
      }));
    }
    return this.snapshot(providerId(subscription.id));
  }

  async snapshot(id: string): Promise<BillingSnapshot> {
    providerId(id);
    const observedAt = new Date().toISOString();
    const subscription = await this.request(`/subscriptions/${encodeURIComponent(id)}`);
    if (!subscription || subscription.id !== id || typeof subscription.externalReference !== 'string' || subscription.externalReference.length > 150) throw new Error('Assinatura sem vínculo interno.');
    const payments = await this.list(`/subscriptions/${encodeURIComponent(id)}/payments`);
    return {
      reference: subscription.externalReference, providerId: providerId(subscription.id),
      customerId: providerId(subscription.customer), providerStatus: subscription.deleted === true ? 'DELETED' : String(subscription.status),
      amount: this.amount(subscription.value), cycle: String(subscription.cycle), observedAt,
      payments: payments.map((p) => {
        if (p.subscription !== id || p.customer !== subscription.customer || typeof p.status !== 'string' ||
          typeof p.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate)) throw new Error('Cobrança incompatível com a assinatura.');
        return { id: providerId(p.id), status: p.deleted === true ? 'DELETED' : p.status,
          amount: this.amount(p.value), dueDate: p.dueDate, invoiceUrl: this.invoiceUrl(p.invoiceUrl) };
      }),
    };
  }

  async cancel(id: string): Promise<void> {
    providerId(id);
    await this.request(`/subscriptions/${encodeURIComponent(id)}`, 'DELETE', undefined, true);
  }

  async subscriptionForPayment(id: string): Promise<string | null> {
    providerId(id);
    const payment = await this.request(`/payments/${encodeURIComponent(id)}`, 'GET', undefined, true);
    return payment?.subscription ? providerId(payment.subscription) : null;
  }

  private amount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Valor Asaas inválido.');
    return value;
  }

  private invoiceUrl(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value !== 'string') throw new Error('URL Asaas inválida.');
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'sandbox.asaas.com' || url.username || url.password || url.port) {
      throw new Error('URL da fatura fora do Sandbox Asaas.');
    }
    return url.href;
  }
}
