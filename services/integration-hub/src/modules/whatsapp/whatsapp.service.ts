import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUES } from '../../config/queues.js';
import type { WhatsAppMessage } from './whatsapp.provider.js';

@Injectable()
export class WhatsAppService {
  constructor(
    @InjectQueue(QUEUES.WHATSAPP) private readonly queue: Queue<WhatsAppMessage>,
  ) {}

  /** Enfileira o envio. `jobId` deduplica reenvios do mesmo evento. */
  async enqueue(message: WhatsAppMessage, jobId?: string): Promise<void> {
    await this.queue.add('send', message, { jobId });
  }
}
