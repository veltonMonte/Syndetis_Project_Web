import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { MailMessage, MailProvider } from '../mail.provider.js';

/**
 * Stub: apenas registra o e-mail no log.
 * TODO: substituir por GmailMailProvider (Gmail API) e trocar o binding em MailModule.
 */
@Injectable()
export class LogMailProvider implements MailProvider {
  readonly name = 'log';
  private readonly logger = new Logger(LogMailProvider.name);

  send(message: MailMessage): Promise<{ messageId: string }> {
    const messageId = `log-${randomUUID()}`;
    this.logger.log(`[stub] e-mail ${messageId} para ${message.to}: "${message.subject}"`);
    return Promise.resolve({ messageId });
  }
}
