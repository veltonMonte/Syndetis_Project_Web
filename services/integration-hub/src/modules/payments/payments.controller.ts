import { timingSafeEqual } from 'node:crypto';
import { Body, Controller, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Type } from 'class-transformer';
import { IsEmail, IsISO8601, IsNumber, IsUUID, Max, Min } from 'class-validator';
import type { Queue } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { Public } from '../../middleware/auth/auth.decorators.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider.js';
import { validMercadoPagoSignature } from './mercadopago-signature.js';

export class CreateCheckoutDto {
  @IsUUID() orderId: string;
  @IsUUID() requestId: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount: number;
  @IsEmail() email: string;
  @IsISO8601() expiresAt: string;
}

@Public()
@Controller()
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectQueue(QUEUES.PAYMENTS) private readonly queue: Queue<{ paymentId: string }>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('internal/payments/checkouts')
  @HttpCode(200)
  async create(@Headers('x-internal-token') token: string | undefined, @Body() request: CreateCheckoutDto) {
    this.requireInternalToken(token);
    return this.provider.createCheckout(request);
  }

  @Get('internal/payments/orders/:orderId')
  async find(@Headers('x-internal-token') token: string | undefined, @Param('orderId', ParseUUIDPipe) orderId: string) {
    this.requireInternalToken(token);
    return this.provider.findPayments(orderId);
  }

  private requireInternalToken(token: string | undefined): void {
    const expected = this.config.get('PAYMENTS_INTERNAL_TOKEN', { infer: true });
    if (expected.length < 32) throw new ServiceUnavailableException('Pagamento ainda não configurado.');
    const actual = Buffer.from(token ?? '');
    const secret = Buffer.from(expected);
    if (actual.length !== secret.length || !timingSafeEqual(actual, secret)) throw new UnauthorizedException();
  }

  @Post('payments/webhook')
  @HttpCode(202)
  async webhook(
    @Query('data.id') paymentId: string,
    @Query('type') type: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-signature') signature: string | undefined,
  ) {
    const secret = this.config.get('MP_WEBHOOK_SECRET', { infer: true });
    if (type !== 'payment' || !validMercadoPagoSignature(secret, paymentId, requestId, signature)) {
      throw new UnauthorizedException('Assinatura de pagamento inválida.');
    }
    await this.queue.add('mercadopago', { paymentId });
    return { accepted: true };
  }
}
