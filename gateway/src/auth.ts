import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { GatewayConfig } from './config.ts';

export type VerifyToken = (token: string) => Promise<void>;

export function tokenVerifier(config: GatewayConfig): VerifyToken {
  const keys = createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 3000 });
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'], issuer: config.issuer, audience: config.audience,
      requiredClaims: ['sub', 'exp', 'role'],
    });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub ?? '') ||
        !['CUSTOMER', 'SELLER', 'ADMIN'].includes(String(payload.role))) {
      throw new Error('Claims de acesso inválidas.');
    }
  };
}
