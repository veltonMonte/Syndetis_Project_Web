import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from './env.validation.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Tipo enxuto, compatível tanto com o ioredis quanto com as opções do BullMQ. */
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

export function redisOptions(config: ConfigService<Env, true>): RedisConnectionConfig {
  return {
    host: config.get('REDIS_HOST', { infer: true }),
    port: config.get('REDIS_PORT', { infer: true }),
    password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
    // Exigido pelo BullMQ; também evita que comandos bloqueantes falhem por retry.
    maxRetriesPerRequest: null,
  };
}

/** Conexão Redis compartilhada para comandos não bloqueantes (health, XACK, XADD...). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => new Redis(redisOptions(config)),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
