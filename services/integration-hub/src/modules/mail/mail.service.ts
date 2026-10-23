import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUES } from '../../config/queues.js';
import type { MailMessage } from './mail.provider.js';

@Injectable()
export class MailService {
  constructor(@InjectQueue(QUEUES.MAIL) private readonly queue: Queue<MailMessage>) {}

  /** Enfileira o envio. `jobId` deduplica reenvios do mesmo evento. */
  async enqueue(message: MailMessage, jobId?: string): Promise<void> {
    await this.queue.add('send', message, { jobId });
  }
}
