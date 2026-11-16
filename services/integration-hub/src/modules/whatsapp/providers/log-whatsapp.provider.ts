import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { WhatsAppMessage, WhatsAppProvider } from '../whatsapp.provider.js';

/**
 * Stub: apenas registra a mensagem no log.
 * TODO: substituir por um provider da WhatsApp Cloud API e trocar o binding em WhatsAppModule.
 */
@Injectable()
export class LogWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'log';
  private readonly logger = new Logger(LogWhatsAppProvider.name);

  send(message: WhatsAppMessage): Promise<{ messageId: string }> {
    const messageId = `log-${randomUUID()}`;
    this.logger.log(`[stub] WhatsApp ${messageId} para ${message.to}`);
    return Promise.resolve({ messageId });
  }
}
