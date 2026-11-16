import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../config/queues.js';
import { MailProcessor } from './mail.processor.js';
import { MAIL_PROVIDER } from './mail.provider.js';
import { MailService } from './mail.service.js';
import { LogMailProvider } from './providers/log-mail.provider.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.MAIL, defaultJobOptions: DEFAULT_JOB_OPTIONS })],
  providers: [
    MailService,
    MailProcessor,
    { provide: MAIL_PROVIDER, useClass: LogMailProvider },
  ],
  exports: [MailService],
})
export class MailModule {}
