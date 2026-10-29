import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.module.js';
import { Public } from '../middleware/auth/auth.decorators.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // A Redis outage makes this instance unready, not dead.
  @Get('live')
  live(): { status: 'UP' } {
    return { status: 'UP' };
  }

  @Get()
  async check(): Promise<{ status: 'UP'; redis: 'UP' }> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Redis health timeout')), 1500);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException({ status: 'DOWN', redis: 'DOWN' });
    } finally {
      if (timer) clearTimeout(timer);
    }
    return { status: 'UP', redis: 'UP' };
  }
}
