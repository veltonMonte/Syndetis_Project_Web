import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider.js';

@Processor(QUEUES.PAYMENTS)
export class PaymentsProcessor extends WorkerHost {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly config: ConfigService<Env, true>,
  ) { super(); }

  async process(job: Job<{ paymentId: string }>): Promise<void> {
    const payment = await this.provider.getPayment(job.data.paymentId);
    const token = this.config.get('PAYMENTS_INTERNAL_TOKEN', { infer: true });
    if (token.length < 32) throw new Error('Credencial interna de pagamento não configurada.');
    const coreUrl = this.config.get('CORE_SERVICE_URL', { infer: true });
    const response = await fetch(`${coreUrl}/internal/payments/notifications`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
      body: JSON.stringify(payment),
    });
    if (!response.ok) throw new Error(`Confirmação de pagamento indisponível (${response.status}).`);
  }
}
