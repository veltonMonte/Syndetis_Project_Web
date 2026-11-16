import { createHmac, timingSafeEqual } from 'node:crypto';

export function validMercadoPagoSignature(
  secret: string, paymentId: string, requestId: string | undefined, signature: string | undefined,
  now = Date.now(),
): boolean {
  if (!secret || !/^\d{1,100}$/.test(paymentId) || !requestId || requestId.length > 200 || !signature) return false;
  const fields = new Map(signature.split(',').map((entry) => {
    const index = entry.indexOf('=');
    return [entry.slice(0, index).trim(), entry.slice(index + 1).trim()];
  }));
  const timestamp = fields.get('ts') ?? '';
  const digest = fields.get('v1') ?? '';
  if (!/^\d{10}(\d{3})?$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(digest)) return false;
  const milliseconds = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1);
  if (Math.abs(now - milliseconds) > 15 * 60 * 1000) return false;
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(digest, 'hex'));
}
