import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../config/env.validation.js';
import { ROLES, type AuthenticatedUser, type Role } from './authenticated-user.js';

/** Resolve a chave pública pelo `kid` do token (JWKS remoto em produção). */
export const JWKS_KEY_RESOLVER = Symbol('JWKS_KEY_RESOLVER');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidTokenError extends Error {}

/**
 * Valida access tokens localmente, sem chamar o auth-service a cada request.
 * Mesmas regras do core-service: RS256, `iss`, `aud`, `sub` UUID e `role` conhecida.
 */
@Injectable()
export class JwtVerifier {
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    @Inject(JWKS_KEY_RESOLVER) private readonly keyResolver: JWTVerifyGetKey,
    config: ConfigService<Env, true>,
  ) {
    this.issuer = config.get('JWT_ISSUER', { infer: true });
    this.audience = config.get('JWT_AUDIENCE', { infer: true });
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.keyResolver, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }));
    } catch (error) {
      throw new InvalidTokenError((error as Error).message);
    }

    const { sub, role, email } = payload;
    if (typeof sub !== 'string' || !UUID_PATTERN.test(sub)) {
      throw new InvalidTokenError('Claim sub inválida');
    }
    if (typeof role !== 'string' || !ROLES.includes(role as Role)) {
      throw new InvalidTokenError('Claim role inválida');
    }
    return {
      id: sub,
      role: role as Role,
      email: typeof email === 'string' ? email : undefined,
    };
  }
}
