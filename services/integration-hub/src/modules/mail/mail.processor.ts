import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUES } from '../../config/queues.js';
import { MAIL_PROVIDER, type MailMessage, type MailProvider } from './mail.provider.js';

@Processor(QUEUES.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {
    super();
  }

  async process(job: Job<MailMessage>): Promise<{ messageId: string }> {
    const result = await this.provider.send(job.data);
    this.logger.debug(`Job ${job.id} enviado via ${this.provider.name}`);
    return result;
  }
}
