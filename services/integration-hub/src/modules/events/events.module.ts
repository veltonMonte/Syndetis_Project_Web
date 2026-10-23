import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { CoreEventsConsumer } from './core-events.consumer.js';
import { NotificationDispatcher } from './notification.dispatcher.js';

@Module({
  imports: [MailModule, WhatsAppModule],
  providers: [NotificationDispatcher, CoreEventsConsumer],
})
export class EventsModule {}
