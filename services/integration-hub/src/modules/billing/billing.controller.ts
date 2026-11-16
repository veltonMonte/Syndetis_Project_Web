import { timingSafeEqual } from 'node:crypto';
import { Body, Controller, Headers, HttpCode, Param, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { IsEmail, IsIn, IsNumber, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import type { Queue } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { Public } from '../../middleware/auth/auth.decorators.js';
import { AsaasProvider } from './asaas.provider.js';

export class CreateSubscriptionDto {
  @IsUUID() reference: string;
  @IsString() @Length(2, 100) name: string;
  @IsEmail() email: string;
  @Matches(/^(\d{11}|\d{14})$/) cpfCnpj: string;
  @IsIn(['Standard', 'Maker']) planName: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999) amount: number;
}
export interface BillingJob { eventId: string; paymentId?: string; subscriptionId?: string }

@Public()
@Controller()
export class BillingController {
  constructor(private readonly provider: AsaasProvider, private readonly config: ConfigService<Env, true>,
    @InjectQueue(QUEUES.BILLING) private readonly queue: Queue<BillingJob>) {}

  private authenticate(token: string | undefined, setting: 'BILLING_INTERNAL_TOKEN' | 'ASAAS_WEBHOOK_TOKEN') {
    const expected = this.config.get(setting, { infer: true });
    if (!this.config.get('BILLING_ENABLED', { infer: true }) || expected.length < 32) {
      throw new ServiceUnavailableException('Assinaturas ainda não configuradas.');
    }
    const actual = Buffer.from(token ?? ''); const secret = Buffer.from(expected);
    if (actual.length !== secret.length || !timingSafeEqual(actual, secret)) throw new UnauthorizedException();
  }

  @Post('internal/billing/subscriptions') @HttpCode(200)
  create(@Headers('x-internal-token') token: string | undefined, @Body() body: CreateSubscriptionDto) {
    this.authenticate(token, 'BILLING_INTERNAL_TOKEN');
    return this.provider.create(body);
  }

  @Post('internal/billing/subscriptions/:id/sync') @HttpCode(200)
  sync(@Headers('x-internal-token') token: string | undefined, @Param('id') id: string) {
    this.authenticate(token, 'BILLING_INTERNAL_TOKEN');
    return this.provider.snapshot(id);
  }

  @Post('internal/billing/subscriptions/:id/cancel') @HttpCode(204)
  cancel(@Headers('x-internal-token') token: string | undefined, @Param('id') id: string) {
    this.authenticate(token, 'BILLING_INTERNAL_TOKEN');
    return this.provider.cancel(id);
  }

  @Post('billing/webhook') @HttpCode(200)
  async webhook(@Headers('asaas-access-token') token: string | undefined, @Body() body: Record<string, unknown>) {
    this.authenticate(token, 'ASAAS_WEBHOOK_TOKEN');
    if (typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(body.id) || typeof body.event !== 'string') {
      throw new UnauthorizedException('Evento inválido.');
    }
    const payment = body.payment as Record<string, unknown> | undefined;
    const subscription = body.subscription as Record<string, unknown> | undefined;
    const job: BillingJob = { eventId: body.id };
    if (body.event.startsWith('PAYMENT_') && payment && typeof payment.id === 'string' && /^pay_[a-zA-Z0-9_-]{1,100}$/.test(payment.id)) job.paymentId = payment.id;
    else if (body.event.startsWith('SUBSCRIPTION_') && subscription && typeof subscription.id === 'string' && /^sub_[a-zA-Z0-9_-]{1,100}$/.test(subscription.id)) job.subscriptionId = subscription.id;
    else return { accepted: true, ignored: true };
    // Persistir na fila antes do ACK; repetir o evento nunca concede um mês adicional.
    await this.queue.add('asaas', job, { jobId: body.id });
    return { accepted: true };
  }
}
