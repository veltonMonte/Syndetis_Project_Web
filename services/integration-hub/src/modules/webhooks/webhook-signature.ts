import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'x-signature-256';

/** Assinatura no formato `sha256=<hex>` do HMAC-SHA256 do corpo bruto. */
export function signPayload(secret: string, rawBody: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

/** Comparação em tempo constante para não vazar informação por timing. */
export function isValidSignature(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signPayload(secret, rawBody));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
