import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { HealthController } from './health.controller.js';

describe('Kubernetes health probes', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps liveness independent from Redis', () => {
    const ping = vi.fn().mockRejectedValue(new Error('offline'));
    const controller = new HealthController({ ping } as unknown as Redis);
    expect(controller.live()).toEqual({ status: 'UP' });
    expect(ping).not.toHaveBeenCalled();
  });

  it('reports readiness only when Redis responds', async () => {
    const controller = new HealthController({ ping: vi.fn().mockResolvedValue('PONG') } as unknown as Redis);
    await expect(controller.check()).resolves.toEqual({ status: 'UP', redis: 'UP' });
    const unavailable = new HealthController({ ping: vi.fn().mockRejectedValue(new Error('offline')) } as unknown as Redis);
    await expect(unavailable.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('bounds readiness when a Redis command never completes', async () => {
    vi.useFakeTimers();
    const controller = new HealthController({ ping: vi.fn(() => new Promise(() => {})) } as unknown as Redis);
    const checked = expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await vi.advanceTimersByTimeAsync(1500);
    await checked;
    expect(vi.getTimerCount()).toBe(0);
  });
});
