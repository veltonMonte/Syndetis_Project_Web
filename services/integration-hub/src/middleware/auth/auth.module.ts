import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import type { Env } from '../../config/env.validation.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JWKS_KEY_RESOLVER, JwtVerifier } from './jwt-verifier.service.js';

@Module({
  providers: [
    {
      provide: JWKS_KEY_RESOLVER,
      inject: [ConfigService],
      // O jose faz cache das chaves e recarrega quando aparece um `kid` novo (rotação).
      useFactory: (config: ConfigService<Env, true>) =>
        createRemoteJWKSet(new URL(config.get('JWT_JWKS_URI', { infer: true }))),
    },
    JwtVerifier,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtVerifier],
})
export class AuthModule {}
