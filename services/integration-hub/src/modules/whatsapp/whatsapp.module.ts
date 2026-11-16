import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../config/queues.js';
import { LogWhatsAppProvider } from './providers/log-whatsapp.provider.js';
import { WhatsAppProcessor } from './whatsapp.processor.js';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.js';
import { WhatsAppService } from './whatsapp.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WHATSAPP, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
  ],
  providers: [
    WhatsAppService,
    WhatsAppProcessor,
    { provide: WHATSAPP_PROVIDER, useClass: LogWhatsAppProvider },
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
