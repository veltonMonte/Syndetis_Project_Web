import { timingSafeEqual } from 'node:crypto';
import { Body, Controller, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Type } from 'class-transformer';
import { IsEmail, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import type { Queue } from 'bullmq';
import type { Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { Public } from '../../middleware/auth/auth.decorators.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider.js';
import { validMercadoPagoSignature } from './mercadopago-signature.js';
import { MercadoPagoOAuth } from './mercadopago-oauth.js';

export class CreateCheckoutDto {
  @IsUUID() orderId: string;
  @IsUUID() requestId: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount: number;
  @IsEmail() email: string;
  @IsISO8601() expiresAt: string;
  @IsOptional() @IsString() @MaxLength(500) sellerAccessToken?: string;
}

export class AuthorizationUrlDto {
  @Matches(/^[A-Za-z0-9_-]{32,128}$/) state: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) codeChallenge: string;
}

export class TokenExchangeDto {
  @IsString() @MaxLength(500) code: string;
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/) codeVerifier: string;
}

export class TokenRefreshDto {
  @IsString() @MaxLength(500) refreshToken: string;
}

export interface PaymentJob { paymentId: string; orderId?: string }

@Public()
@Controller()
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectQueue(QUEUES.PAYMENTS) private readonly queue: Queue<PaymentJob>,
    private readonly config: ConfigService<Env, true>,
    private readonly oauth: MercadoPagoOAuth,
  ) {}

  @Post('internal/payments/checkouts')
  @HttpCode(200)
  async create(@Headers('x-internal-token') token: string | undefined, @Body() request: CreateCheckoutDto) {
    this.requireInternalToken(token);
    return this.provider.createCheckout(request);
  }

  @Get('internal/payments/orders/:orderId')
  async find(
    @Headers('x-internal-token') token: string | undefined,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Headers('x-seller-access-token') sellerAccessToken: string | undefined,
  ) {
    this.requireInternalToken(token);
    return this.provider.findPayments(orderId, sellerAccessToken || undefined);
  }

  /** Whether merchants can connect their own Mercado Pago account (the platform registered its application). */
  @Get('internal/payments/oauth')
  oauthStatus(@Headers('x-internal-token') token: string | undefined) {
    this.requireInternalToken(token);
    return { configured: this.oauth.configured };
  }

  @Post('internal/payments/oauth/authorization-url')
  @HttpCode(200)
  authorizationUrl(@Headers('x-internal-token') token: string | undefined, @Body() request: AuthorizationUrlDto) {
    this.requireInternalToken(token);
    return { url: this.oauth.authorizationUrl(request.state, request.codeChallenge) };
  }

  @Post('internal/payments/oauth/token')
  @HttpCode(200)
  exchange(@Headers('x-internal-token') token: string | undefined, @Body() request: TokenExchangeDto) {
    this.requireInternalToken(token);
    return this.oauth.exchange(request.code, request.codeVerifier);
  }

  @Post('internal/payments/oauth/refresh')
  @HttpCode(200)
  refresh(@Headers('x-internal-token') token: string | undefined, @Body() request: TokenRefreshDto) {
    this.requireInternalToken(token);
    return this.oauth.refresh(request.refreshToken);
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
    @Query('order') orderId?: string,
  ) {
    const secret = this.config.get('MP_WEBHOOK_SECRET', { infer: true });
    if (type !== 'payment' || !validMercadoPagoSignature(secret, paymentId, requestId, signature)) {
      throw new UnauthorizedException('Assinatura de pagamento inválida.');
    }
    // Preferences created with a merchant's own token carry their order, so the core-service reconciles the
    // payment with that token. Older preferences (platform account) are fetched here as before.
    const order = orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId) ? orderId : undefined;
    await this.queue.add('mercadopago', order ? { paymentId, orderId: order } : { paymentId });
    return { accepted: true };
  }
}
