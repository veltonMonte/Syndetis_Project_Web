import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import type { MailService } from '../mail/mail.service.js';
import type { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { validEvent } from './core-event.spec.js';
import { CoreEventsConsumer } from './core-events.consumer.js';
import { NotificationDispatcher } from './notification.dispatcher.js';
import { renderOrderNotification, toE164 } from './notification-templates.js';
import { parseCoreEvent } from './core-event.js';

const STREAM = 'syndetis:core-events';

function setup() {
  const mail = { enqueue: vi.fn().mockResolvedValue(undefined) };
  const whatsapp = { enqueue: vi.fn().mockResolvedValue(undefined) };
  const redis = { xack: vi.fn().mockResolvedValue(1), xadd: vi.fn().mockResolvedValue('1-0') };
  const dispatcher = new NotificationDispatcher(
    mail as unknown as MailService,
    whatsapp as unknown as WhatsAppService,
  );
  const config = new ConfigService({
    CORE_EVENTS_ENABLED: false,
    CORE_EVENTS_STREAM: STREAM,
    CORE_EVENTS_GROUP: 'integration-hub',
  });
  const consumer = new CoreEventsConsumer(
    redis as unknown as Redis,
    dispatcher,
    config as ConfigService<any, true>,
  );
  return { mail, whatsapp, redis, consumer };
}

describe('toE164', () => {
  it.each([
    ['(11) 98888-7777', '+5511988887777'],
    ['11 3333-4444', '+551133334444'],
    ['+55 11 98888-7777', '+5511988887777'],
    ['5511988887777', '+5511988887777'],
    ['+1 415 555 0100', '+14155550100'],
    ['123', undefined],
    [undefined, undefined],
  ])('%s → %s', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });
});

describe('renderOrderNotification', () => {
  it('formata número curto do pedido e total em reais', () => {
    const { subject, text } = renderOrderNotification(parseCoreEvent(JSON.stringify(validEvent())));
    expect(subject).toBe('Pagamento confirmado #A1B2C3D4');
    expect(text).toContain('Olá, Ana!');
    expect(text).toContain('R$ 149,90');
  });
});

describe('CoreEventsConsumer.handle', () => {
  it('enfileira e-mail e WhatsApp com jobId idempotente e confirma a entrada', async () => {
    const { mail, whatsapp, redis, consumer } = setup();
    const event = validEvent();

    await expect(consumer.handle('1-0', ['event', JSON.stringify(event)])).resolves.toBe(true);

    expect(mail.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@example.com' }),
      `${event.id}-mail`,
    );
    expect(whatsapp.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+5511988887777' }),
      `${event.id}-whatsapp`,
    );
    expect(redis.xack).toHaveBeenCalledWith(STREAM, 'integration-hub', '1-0');
  });

  it('não envia WhatsApp sem telefone', async () => {
    const { whatsapp, consumer } = setup();
    const event = validEvent({
      data: { ...validEvent().data, customer: { name: 'Ana', email: 'ana@example.com' } },
    });
    await consumer.handle('1-0', ['event', JSON.stringify(event)]);
    expect(whatsapp.enqueue).not.toHaveBeenCalled();
  });

  it('manda evento inválido para o dead-letter e confirma', async () => {
    const { mail, redis, consumer } = setup();
    await expect(consumer.handle('2-0', ['event', '{nope'])).resolves.toBe(true);
    expect(mail.enqueue).not.toHaveBeenCalled();
    expect(redis.xadd).toHaveBeenCalledWith(
      `${STREAM}:dead`, '*', 'event', '{nope', 'error', 'JSON inválido', 'sourceId', '2-0',
    );
    expect(redis.xack).toHaveBeenCalledWith(STREAM, 'integration-hub', '2-0');
  });

  it('mantém pendente quando a fila falha (será reprocessado)', async () => {
    const { mail, redis, consumer } = setup();
    mail.enqueue.mockRejectedValueOnce(new Error('redis caiu'));
    await expect(consumer.handle('3-0', ['event', JSON.stringify(validEvent())])).resolves.toBe(false);
    expect(redis.xack).not.toHaveBeenCalled();
  });
});
