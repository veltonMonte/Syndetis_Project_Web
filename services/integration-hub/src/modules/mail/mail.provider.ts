export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<{ messageId: string }>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
