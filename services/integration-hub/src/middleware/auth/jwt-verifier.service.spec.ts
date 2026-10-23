import { ConfigService } from '@nestjs/config';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';
import { InvalidTokenError, JwtVerifier } from './jwt-verifier.service.js';

const ISSUER = 'http://localhost:8081';
const AUDIENCE = 'syndetis';
const USER_ID = '7f3c1d1e-6b0a-4c55-9a2e-1f0c8f9b2a11';

describe('JwtVerifier', () => {
  let privateKey: CryptoKey;
  let resolver: JWTVerifyGetKey;
  let verifier: JwtVerifier;

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
    resolver = createLocalJWKSet({ keys: [jwk] });
    const config = new ConfigService({ JWT_ISSUER: ISSUER, JWT_AUDIENCE: AUDIENCE });
    verifier = new JwtVerifier(resolver, config as ConfigService<any, true>);
  });

  const sign = (claims: Record<string, unknown>, opts: { iss?: string; aud?: string; exp?: string } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(opts.iss ?? ISSUER)
      .setAudience(opts.aud ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '5m')
      .sign(privateKey);

  it('aceita token válido e extrai o usuário', async () => {
    const token = await sign({ sub: USER_ID, role: 'SELLER', email: 'a@b.com' });
    await expect(verifier.verify(token)).resolves.toEqual({
      id: USER_ID,
      role: 'SELLER',
      email: 'a@b.com',
    });
  });

  it.each([
    ['issuer errado', { sub: USER_ID, role: 'CUSTOMER' }, { iss: 'http://evil' }],
    ['audience errada', { sub: USER_ID, role: 'CUSTOMER' }, { aud: 'outro' }],
    ['expirado', { sub: USER_ID, role: 'CUSTOMER' }, { exp: '-1m' }],
    ['sub não UUID', { sub: '42', role: 'CUSTOMER' }, {}],
    ['role desconhecida', { sub: USER_ID, role: 'ROOT' }, {}],
  ])('rejeita token com %s', async (_name, claims, opts) => {
    const token = await sign(claims, opts);
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejeita token assinado por outra chave', async () => {
    const other = await generateKeyPair('RS256');
    const token = await new SignJWT({ sub: USER_ID, role: 'ADMIN' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(other.privateKey);
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
