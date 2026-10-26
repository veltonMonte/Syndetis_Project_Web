import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../config/queues.js';
import { MercadoPagoProvider } from './mercadopago.provider.js';
import { PAYMENT_PROVIDER } from './payment.provider.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsProcessor } from './payments.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.PAYMENTS, defaultJobOptions: DEFAULT_JOB_OPTIONS })],
  controllers: [PaymentsController],
  providers: [PaymentsProcessor, { provide: PAYMENT_PROVIDER, useClass: MercadoPagoProvider }],
})
export class PaymentsModule {}
