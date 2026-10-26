import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv, type Env } from './config/env.validation.js';
import { redisOptions, RedisModule } from './config/redis.module.js';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './middleware/auth/auth.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { ShippingModule } from './modules/shipping/shipping.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisOptions(config),
        prefix: 'syndetis',
      }),
    }),
    RedisModule,
    AuthModule,
    ShippingModule,
    MailModule,
    WhatsAppModule,
    WebhooksModule,
    EventsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
