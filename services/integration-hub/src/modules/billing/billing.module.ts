import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../config/queues.js';
import { AsaasProvider } from './asaas.provider.js';
import { BillingController } from './billing.controller.js';
import { BillingProcessor } from './billing.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.BILLING, defaultJobOptions: DEFAULT_JOB_OPTIONS })],
  controllers: [BillingController], providers: [AsaasProvider, BillingProcessor],
})
export class BillingModule {}
