import type { CoreEvent, CoreEventType } from './core-event.js';

export interface RenderedNotification {
  subject: string;
  text: string;
}

const HEADLINES: Record<CoreEventType, { subject: string; body: string }> = {
  'order.created': {
    subject: 'Recebemos seu pedido',
    body: 'Recebemos seu pedido e ele está aguardando confirmação de pagamento.',
  },
  'order.paid': {
    subject: 'Pagamento confirmado',
    body: 'O pagamento do seu pedido foi confirmado. Já estamos preparando o envio.',
  },
  'order.shipped': {
    subject: 'Pedido enviado',
    body: 'Seu pedido foi enviado e está a caminho.',
  },
  'order.delivered': {
    subject: 'Pedido entregue',
    body: 'Seu pedido foi entregue. Obrigado pela compra!',
  },
  'order.canceled': {
    subject: 'Pedido cancelado',
    body: 'Seu pedido foi cancelado. Se o pagamento já tiver sido feito, o estorno será processado.',
  },
};

export function renderOrderNotification(event: CoreEvent): RenderedNotification {
  const { subject, body } = HEADLINES[event.type];
  const { customer, orderId, total } = event.data;
  const shortId = orderId.slice(0, 8).toUpperCase();
  const totalBrl = `R$ ${total.replace('.', ',')}`;
  return {
    subject: `${subject} #${shortId}`,
    text: `Olá, ${customer.name}!\n\n${body}\n\nPedido: #${shortId}\nTotal: ${totalBrl}`,
  };
}

/**
 * Normaliza o telefone livre do cadastro para E.164.
 * Números com 10–11 dígitos sem DDI são tratados como brasileiros.
 */
export function toE164(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
  }
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`;
  }
  return undefined;
}
