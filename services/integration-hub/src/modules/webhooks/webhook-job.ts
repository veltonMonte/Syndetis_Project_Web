export interface WebhookJob {
  provider: string;
  eventId?: string;
  receivedAt: string;
  payload: unknown;
}
