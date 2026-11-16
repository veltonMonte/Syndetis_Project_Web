import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { AsaasProvider } from './asaas.provider.js';
import type { BillingJob } from './billing.controller.js';

@Processor(QUEUES.BILLING)
export class BillingProcessor extends WorkerHost {
  constructor(private readonly provider: AsaasProvider, private readonly config: ConfigService<Env, true>) { super(); }
  async process(job: Job<BillingJob>): Promise<void> {
    const id = job.data.subscriptionId ?? (job.data.paymentId ? await this.provider.subscriptionForPayment(job.data.paymentId) : null);
    if (!id) return;
    const snapshot = await this.provider.snapshot(id);
    // Assinaturas criadas fora do Syndetis não possuem uma referência UUID.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(snapshot.reference)) return;
    const token = this.config.get('BILLING_INTERNAL_TOKEN', { infer: true });
    if (token.length < 32) throw new Error('Credencial interna de assinatura ausente.');
    const response = await fetch(`${this.config.get('CORE_SERVICE_URL', { infer: true })}/internal/billing/notifications`, {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token }, body: JSON.stringify(snapshot),
    });
    if (!response.ok) throw new Error(`Conciliação de assinatura indisponível (${response.status}).`);
  }
}
