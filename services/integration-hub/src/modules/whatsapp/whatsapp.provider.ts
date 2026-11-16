export interface WhatsAppMessage {
  /** Telefone em formato E.164, ex.: +5511999998888 */
  to: string;
  text: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<{ messageId: string }>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
