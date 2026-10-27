import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import { BillingController } from '../src/modules/billing/billing.controller.js';
import { AsaasProvider } from '../src/modules/billing/asaas.provider.js';
import { QUEUES } from '../src/config/queues.js';

const internal = 'internal-billing-token-at-least-32-characters';
const webhook = 'webhook-billing-token-at-least-32-characters';
const create = vi.fn().mockResolvedValue({ providerId: 'sub_test' });
const add = vi.fn().mockResolvedValue({ id: 'job' });
let app: INestApplication;
beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [BillingController], providers: [
      { provide: AsaasProvider, useValue: { create } },
      { provide: ConfigService, useValue: new ConfigService({ BILLING_ENABLED: true, BILLING_INTERNAL_TOKEN: internal, ASAAS_WEBHOOK_TOKEN: webhook }) },
      { provide: getQueueToken(QUEUES.BILLING), useValue: { add } },
    ],
  }).compile();
  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
});
afterAll(async () => app.close());
beforeEach(() => vi.clearAllMocks());

describe('Billing HTTP', () => {
  const body = { reference: '7b3cda7a-33f4-4f64-8eef-664b187d6ca5', name: 'Seller', email: 'seller@example.test',
    cpfCnpj: '12345678909', planName: 'Standard', amount: 29.9 };
  it('protege criacao por token interno', async () => {
    await request(app.getHttpServer()).post('/internal/billing/subscriptions').send(body).expect(401);
    expect(create).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post('/internal/billing/subscriptions').set('X-Internal-Token', internal).send(body).expect(200);
    expect(create).toHaveBeenCalledOnce();
  });
  it('valida dados e rejeita campos nao contratados', async () => {
    await request(app.getHttpServer()).post('/internal/billing/subscriptions').set('X-Internal-Token', internal)
      .send({ ...body, amount: -1, cpfCnpj: 'invalid' }).expect(400);
    await request(app.getHttpServer()).post('/internal/billing/subscriptions').set('X-Internal-Token', internal)
      .send({ ...body, creditCard: 'never-accept-card-data' }).expect(400);
    expect(create).not.toHaveBeenCalled();
  });
  it('aceita o corpo do webhook com campos adicionais depois de autenticar', async () => {
    const event = { id: 'evt_test', event: 'PAYMENT_RECEIVED', dateCreated: '2026-10-27', payment: { id: 'pay_test', value: 29.9 } };
    await request(app.getHttpServer()).post('/billing/webhook').send(event).expect(401);
    await request(app.getHttpServer()).post('/billing/webhook').set('asaas-access-token', webhook).send(event).expect(200);
    expect(add).toHaveBeenCalledWith('asaas', { eventId: 'evt_test', paymentId: 'pay_test' }, { jobId: 'evt_test' });
  });
});
