import { createHmac } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';
import { QUEUES } from '../src/config/queues.js';
import { REDIS_CLIENT } from '../src/config/redis.module.js';
import { HealthController } from '../src/health/health.controller.js';
import { AuthModule } from '../src/middleware/auth/auth.module.js';
import { JWKS_KEY_RESOLVER } from '../src/middleware/auth/jwt-verifier.service.js';
import { ShippingController } from '../src/modules/shipping/shipping.controller.js';
import { ShippingService } from '../src/modules/shipping/shipping.service.js';
import { SHIPPING_PROVIDER } from '../src/modules/shipping/shipping.provider.js';
import { StubShippingProvider } from '../src/modules/shipping/providers/stub-shipping.provider.js';
import { WebhooksController } from '../src/modules/webhooks/webhooks.controller.js';

describe('Syndetis Integration Hub - Limites, Segurança e Resiliência (E2E)', () => {
  let app: INestApplication;
  let privateKey: CryptoKey;
  let otherPrivateKey: CryptoKey;
  let validToken: string;

  const ISSUER = 'http://localhost:8081';
  const AUDIENCE = 'syndetis';
  const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const WEBHOOK_SECRET = 'super-secret-key-123';

  const mockRedis = {
    ping: vi.fn().mockResolvedValue('PONG'),
    duplicate: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };

  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256' };
    const resolver = createLocalJWKSet({ keys: [jwk] });

    const otherPair = await generateKeyPair('RS256');
    otherPrivateKey = otherPair.privateKey;

    validToken = await new SignJWT({ sub: USER_ID, role: 'CUSTOMER', email: 'test@syndetis.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              INTEGRATION_HUB_PORT: 3001,
              REDIS_HOST: 'localhost',
              REDIS_PORT: 6379,
              JWT_JWKS_URI: 'http://localhost:8081/.well-known/jwks.json',
              JWT_ISSUER: ISSUER,
              JWT_AUDIENCE: AUDIENCE,
              CORE_EVENTS_ENABLED: false,
              CORE_EVENTS_STREAM: 'syndetis:core-events',
              CORE_EVENTS_GROUP: 'integration-hub',
              SHIPPING_ORIGIN_ZIP: '01001000',
              WEBHOOK_SECRETS: `stripe:${WEBHOOK_SECRET}`,
            }),
          ],
        }),
        AuthModule,
      ],
      controllers: [HealthController, ShippingController, WebhooksController],
      providers: [
        ShippingService,
        { provide: SHIPPING_PROVIDER, useClass: StubShippingProvider },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: getQueueToken(QUEUES.WEBHOOKS), useValue: mockQueue },
      ],
    })
      .overrideProvider(JWKS_KEY_RESOLVER)
      .useValue(resolver)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Segurança e Autenticação JWT (Rotas Protegidas)', () => {
    it('bloqueia requisição sem token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Access token ausente/);
    });

    it('bloqueia token com esquema incorreto (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Basic ${validToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
    });

    it('bloqueia token forjado assinado por outra chave privada (401)', async () => {
      const forgedToken = await new SignJWT({ sub: USER_ID, role: 'ADMIN' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('1h')
        .sign(otherPrivateKey);

      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${forgedToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Access token inválido/);
    });

    it('bloqueia token expirado (401)', async () => {
      const expiredToken = await new SignJWT({ sub: USER_ID, role: 'CUSTOMER' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('-10s')
        .sign(privateKey);

      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
    });

    it('bloqueia token com role desconhecida ou manipulada (401)', async () => {
      const tamperedRoleToken = await new SignJWT({ sub: USER_ID, role: 'SUPERUSER_HACKER' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${tamperedRoleToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
    });

    it('bloqueia token com sub que não é UUID (401)', async () => {
      const nonUuidToken = await new SignJWT({ sub: "admin' OR 1=1 --", role: 'CUSTOMER' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${nonUuidToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(401);
    });

    it('autoriza com sucesso com token legítimo (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ destinationZipCode: '20040002', packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }] });

      expect(res.status).toBe(200);
      expect(res.body.options).toHaveLength(2);
      expect(res.body.options[0].service).toBe('PAC');
      expect(res.body.options[1].service).toBe('SEDEX');
    });
  });

  describe('2. Validação e Teste de Limites de Entrada (Fuzzing / Input Boundary)', () => {
    it.each([
      ['CEP com SQL Injection', { destinationZipCode: "20040' OR '1'='1" }],
      ['CEP com XSS', { destinationZipCode: "<script>alert(1)</script>" }],
      ['CEP curto', { destinationZipCode: '123' }],
      ['CEP com letras', { destinationZipCode: 'abcdefgh' }],
      ['Peso unitário negativo', { packages: [{ weightGrams: -10, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 1 }] }],
      ['Peso unitário zerado', { packages: [{ weightGrams: 0, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 1 }] }],
      ['Peso unitário acima de 30kg', { packages: [{ weightGrams: 30001, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 1 }] }],
      ['Dimensões maiores que 100cm', { packages: [{ weightGrams: 500, lengthCm: 101, widthCm: 10, heightCm: 10, quantity: 1 }] }],
      ['Quantidade zerada', { packages: [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 0 }] }],
      ['Quantidade acima de 100', { packages: [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 101 }] }],
      ['Lista de pacotes vazia', { packages: [] }],
      ['Lista com mais de 100 pacotes', { packages: Array.from({ length: 101 }, () => ({ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 1 })) }],
    ])('rejeita entrada com %s (400)', async (_title, override) => {
      const validPayload = {
        destinationZipCode: '20040002',
        packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }],
      };

      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validPayload, ...override });

      expect(res.status).toBe(400);
    });

    it('bloqueia injeção de propriedades não permitidas (400 forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/shipping/quotes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          destinationZipCode: '20040002',
          packages: [{ weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, quantity: 1 }],
          adminOverride: true,
          discountCode: 'FREE_100',
        });

      expect(res.status).toBe(400);
      expect(res.body.message.some((m: string) => m.includes('should not exist'))).toBe(true);
    });
  });

  describe('3. Segurança de Webhooks (HMAC SHA-256 e Anti-Tampering)', () => {
    const payload = JSON.stringify({ id: 'evt_123', status: 'succeeded', amount: 5000 });

    const createSignature = (secret: string, body: string) =>
      `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

    it('rejeita webhook para provedor não cadastrado (404)', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/desconhecido')
        .send(payload);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Provedor de webhook desconhecido/);
    });

    it('rejeita webhook sem assinatura HMAC (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Assinatura inválida/);
    });

    it('rejeita webhook com assinatura adulterada (401)', async () => {
      const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      const res = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('x-signature-256', invalidSignature)
        .send(payload);

      expect(res.status).toBe(401);
    });

    it('detecta adulteração de corpo (Man-in-the-Middle) com assinatura original (401)', async () => {
      const signatureOfOriginal = createSignature(WEBHOOK_SECRET, payload);
      const tamperedPayload = JSON.stringify({ id: 'evt_123', status: 'succeeded', amount: 999999 });

      const res = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('x-signature-256', signatureOfOriginal)
        .send(tamperedPayload);

      expect(res.status).toBe(401);
    });

    it('aceita webhook com assinatura válida e coloca na fila com jobId idempotente (202)', async () => {
      const signature = createSignature(WEBHOOK_SECRET, payload);

      const res = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('x-signature-256', signature)
        .set('x-event-id', 'evt_uniq_001')
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ accepted: true });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'stripe',
        expect.objectContaining({ provider: 'stripe', eventId: 'evt_uniq_001' }),
        { jobId: 'stripe-evt_uniq_001' },
      );
    });
  });

  describe('4. Resiliência de Infraestrutura (/health)', () => {
    it('retorna 200 OK quando o Redis responde ao ping', async () => {
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'UP', redis: 'UP' });
    });

    it('retorna 503 Service Unavailable quando o Redis cai', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection lost'));

      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'DOWN', redis: 'DOWN' });
    });
  });
});
