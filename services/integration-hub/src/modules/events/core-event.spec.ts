import { CORE_EVENT_TYPES, InvalidCoreEventError, parseCoreEvent } from './core-event.js';

export const validEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b',
  type: 'order.paid',
  occurredAt: '2026-10-22T18:00:00Z',
  version: 1,
  data: {
    orderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    storeId: 'b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    total: '149.90',
    customer: { name: 'Ana', email: 'ana@example.com', phone: '(11) 98888-7777' },
  },
  ...overrides,
});

describe('parseCoreEvent', () => {
  it('aceita envelope válido', () => {
    const event = parseCoreEvent(JSON.stringify(validEvent()));
    expect(event.type).toBe('order.paid');
    expect(event.data.customer.email).toBe('ana@example.com');
  });

  it('cobre todos os status de pedido do core', () => {
    for (const type of CORE_EVENT_TYPES) {
      expect(() => parseCoreEvent(JSON.stringify(validEvent({ type })))).not.toThrow();
    }
  });

  it.each([
    ['campo ausente', undefined],
    ['JSON inválido', '{nope'],
    ['não objeto', '"texto"'],
    ['tipo desconhecido', JSON.stringify(validEvent({ type: 'order.refunded' }))],
    ['id não UUID', JSON.stringify(validEvent({ id: '1' }))],
    [
      'e-mail inválido',
      JSON.stringify(
        validEvent({
          data: { ...validEvent().data, customer: { name: 'Ana', email: 'x' } },
        }),
      ),
    ],
    ['total sem centavos', JSON.stringify(validEvent({ data: { ...validEvent().data, total: '149.9' } }))],
  ])('rejeita %s', (_name, json) => {
    expect(() => parseCoreEvent(json)).toThrow(InvalidCoreEventError);
  });
});
