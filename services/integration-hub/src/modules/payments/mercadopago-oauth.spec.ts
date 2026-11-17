import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';
import { MercadoPagoOAuth } from './mercadopago-oauth.js';
import { MercadoPagoProvider } from './mercadopago.provider.js';

const fakeFetch = vi.fn();
const config = (values: Partial<Env> = {}) => new ConfigService<Env, true>(Object.assign(new Env(),
  { MP_CLIENT_ID: '1234', MP_CLIENT_SECRET: 'app-secret', PUBLIC_ORIGIN: 'https://loja.example.com', MP_SANDBOX: true }, values));
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
beforeEach(() => { vi.stubGlobal('fetch', fakeFetch); fakeFetch.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Mercado Pago OAuth: o lojista conecta a conta sem copiar chaves', () => {
  it('monta a autorização com PKCE, estado e a volta pelo core-service', () => {
    const url = new URL(new MercadoPagoOAuth(config()).authorizationUrl('s'.repeat(43), challenge));
    expect(url.origin + url.pathname).toBe('https://auth.mercadopago.com/authorization');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: '1234', response_type: 'code', platform_id: 'mp', state: 's'.repeat(43),
      redirect_uri: 'https://loja.example.com/api/core/public/payments/mercadopago/callback',
      code_challenge: challenge, code_challenge_method: 'S256',
    });
  });

  it('troca o código pelo token da conta do lojista e lê o apelido da conta', async () => {
    fakeFetch.mockImplementation(async (url: string) => url.endsWith('/oauth/token')
      ? Response.json({ access_token: 'APP_USR-seller', refresh_token: 'TG-refresh', public_key: 'APP_USR-public', user_id: 987654, live_mode: false, expires_in: 15552000 })
      : Response.json({ id: 987654, nickname: 'CASABRISA' }));
    const account = await new MercadoPagoOAuth(config()).exchange('TG-code', verifier);
    expect(account).toEqual({ accessToken: 'APP_USR-seller', refreshToken: 'TG-refresh', publicKey: 'APP_USR-public',
      userId: '987654', nickname: 'CASABRISA', liveMode: false, expiresIn: 15552000 });
    const body = JSON.parse((fakeFetch.mock.calls[0][1] as RequestInit).body as string) as Record<string, string>;
    expect(body).toEqual({ client_id: '1234', client_secret: 'app-secret', grant_type: 'authorization_code', code: 'TG-code',
      code_verifier: verifier, redirect_uri: 'https://loja.example.com/api/core/public/payments/mercadopago/callback', test_token: 'true' });
  });

  it('renova o token e, em produção, não pede credenciais de teste', async () => {
    fakeFetch.mockImplementation(async (url: string) => url.endsWith('/oauth/token')
      ? Response.json({ access_token: 'APP_USR-new', refresh_token: 'TG-new', user_id: '987654', live_mode: true, expires_in: 100 })
      : new Response('', { status: 500 }));
    const account = await new MercadoPagoOAuth(config({ MP_SANDBOX: false })).refresh('TG-old');
    expect(account).toMatchObject({ accessToken: 'APP_USR-new', refreshToken: 'TG-new', liveMode: true, nickname: undefined });
    expect(JSON.parse((fakeFetch.mock.calls[0][1] as RequestInit).body as string)).toEqual(
      { client_id: '1234', client_secret: 'app-secret', grant_type: 'refresh_token', refresh_token: 'TG-old' });
  });

  it('recusa códigos inválidos, respostas incompletas e plataforma sem aplicação', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json({ message: 'invalid_grant' }, { status: 400 }));
    await expect(new MercadoPagoOAuth(config()).exchange('used', verifier)).rejects.toBeInstanceOf(BadRequestException);
    fakeFetch.mockResolvedValueOnce(Response.json({ access_token: 'x' }));
    await expect(new MercadoPagoOAuth(config()).exchange('code', verifier)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(() => new MercadoPagoOAuth(config({ MP_CLIENT_ID: '' })).authorizationUrl('s'.repeat(43), challenge)).toThrow(ServiceUnavailableException);
  });

  it('cobra na conta do lojista quando o pedido traz o token dele, e avisa o pedido na notificação', async () => {
    const provider = new MercadoPagoProvider(config({ MP_ACCESS_TOKEN: 'APP_USR-platform' }));
    fakeFetch.mockResolvedValue(Response.json({ id: 'pref', init_point: 'https://www.mercadopago.com.br/checkout/start?pref_id=pref' }));
    const orderId = '50dbe962-04c4-4db3-b729-b7f070a6a6ec';
    await provider.createCheckout({ orderId, requestId: orderId, amount: 10, email: 'b@example.com',
      expiresAt: new Date(Date.now() + 60000).toISOString(), sellerAccessToken: 'APP_USR-seller' });
    const options = fakeFetch.mock.calls[0][1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer APP_USR-seller');
    expect(JSON.parse(options.body as string).notification_url).toBe(`https://loja.example.com/api/payments/webhooks/mercadopago?order=${orderId}`);

    fakeFetch.mockImplementation(async () => Response.json({ results: [] }));
    await provider.findPayments(orderId, 'APP_USR-seller');
    expect((fakeFetch.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer APP_USR-seller' });
    await provider.findPayments(orderId);
    expect((fakeFetch.mock.calls[2][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer APP_USR-platform' });
  });
});
