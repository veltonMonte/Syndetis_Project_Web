import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUES } from '../../config/queues.js';
import type { WebhookJob } from './webhook-job.js';

@Processor(QUEUES.WEBHOOKS)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  /**
   * Stub: apenas registra o recebimento.
   * TODO: despachar por `job.data.provider` para handlers específicos
   * (ex.: confirmação de pagamento → publicar evento para o core-service).
   */
  process(job: Job<WebhookJob>): Promise<void> {
    this.logger.log(
      `[stub] webhook ${job.data.provider} recebido (job ${job.id}, evento ${job.data.eventId ?? 'sem id'})`,
    );
    return Promise.resolve();
  }
}
