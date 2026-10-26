import { createHmac } from 'node:crypto';
import { validMercadoPagoSignature } from './mercadopago-signature.js';

const now = 1793025600000;
const secret = 'test-webhook-secret';
const id = '123456789';
const request = 'request-123';
function signature(timestamp = String(now)) {
  return `ts=${timestamp},v1=${createHmac('sha256', secret).update(`id:${id};request-id:${request};ts:${timestamp};`).digest('hex')}`;
}
describe('Assinatura Mercado Pago', () => {
  it('aceita notificações assinadas com timestamp em segundos ou milissegundos', () => {
    expect(validMercadoPagoSignature(secret, id, request, signature(), now)).toBe(true);
    expect(validMercadoPagoSignature(secret, id, request, signature(String(now / 1000)), now)).toBe(true);
  });
  it('rejeita alterações de identificador, segredo e request-id', () => {
    expect(validMercadoPagoSignature(secret, '999', request, signature(), now)).toBe(false);
    expect(validMercadoPagoSignature(secret, id, 'other', signature(), now)).toBe(false);
    expect(validMercadoPagoSignature('other', id, request, signature(), now)).toBe(false);
  });
  it('rejeita mensagens antigas, cabeçalhos ausentes e valores malformados sem lançar erro', () => {
    for (const value of [undefined, '', 'ts=bad,v1=no', `ts=${now},v1=00`]) {
      expect(validMercadoPagoSignature(secret, id, request, value, now)).toBe(false);
    }
    expect(validMercadoPagoSignature(secret, id, request, signature(String(now - 3600000)), now)).toBe(false);
    expect(validMercadoPagoSignature('', id, request, signature(), now)).toBe(false);
  });
});
