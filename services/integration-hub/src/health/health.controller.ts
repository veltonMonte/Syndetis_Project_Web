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

  @Get()
  async check(): Promise<{ status: 'UP'; redis: 'UP' }> {
    try {
      await this.redis.ping();
    } catch {
      throw new ServiceUnavailableException({ status: 'DOWN', redis: 'DOWN' });
    }
    return { status: 'UP', redis: 'UP' };
  }
}
