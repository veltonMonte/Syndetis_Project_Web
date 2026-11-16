import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import type { CoreEvent } from './core-event.js';
import { renderOrderNotification, toE164 } from './notification-templates.js';

/** Converte eventos do core em jobs de notificação (e-mail sempre, WhatsApp se houver telefone). */
@Injectable()
export class NotificationDispatcher {
  constructor(
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async dispatch(event: CoreEvent): Promise<void> {
    const { subject, text } = renderOrderNotification(event);
    const { customer } = event.data;

    // jobId derivado do id do evento: reentrega do stream não duplica notificação.
    await this.mail.enqueue({ to: customer.email, subject, text }, `${event.id}-mail`);

    const phone = toE164(customer.phone);
    if (phone) {
      await this.whatsapp.enqueue({ to: phone, text }, `${event.id}-whatsapp`);
    }
  }
}
