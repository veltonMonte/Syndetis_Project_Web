import type { DefaultJobOptions } from 'bullmq';

/** Filas internas do hub (BullMQ). Só o próprio hub produz e consome. */
export const QUEUES = {
  MAIL: 'mail',
  WHATSAPP: 'whatsapp',
  WEBHOOKS: 'webhooks',
  PAYMENTS: 'payments',
} as const;

/** Retry com backoff exponencial; jobs concluídos são descartados e falhas ficam para inspeção. */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};
