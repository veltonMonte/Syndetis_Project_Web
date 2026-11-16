import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUES } from '../../config/queues.js';
import {
  WHATSAPP_PROVIDER,
  type WhatsAppMessage,
  type WhatsAppProvider,
} from './whatsapp.provider.js';

@Processor(QUEUES.WHATSAPP)
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(@Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProvider) {
    super();
  }

  async process(job: Job<WhatsAppMessage>): Promise<{ messageId: string }> {
    const result = await this.provider.send(job.data);
    this.logger.debug(`Job ${job.id} enviado via ${this.provider.name}`);
    return result;
  }
}
