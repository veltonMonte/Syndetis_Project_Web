import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../config/queues.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksProcessor } from './webhooks.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WEBHOOKS, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksProcessor],
})
export class WebhooksModule {}
