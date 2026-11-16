import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  // rawBody é necessário para validar a assinatura HMAC dos webhooks.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  const openApi = new DocumentBuilder()
    .setTitle('Syndetis Integration Hub')
    .setDescription('Frete, notificações (e-mail/WhatsApp) e webhooks')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApi));

  const port = app.get(ConfigService<Env, true>).get('INTEGRATION_HUB_PORT', { infer: true });
  await app.listen(port);
  Logger.log(`integration-hub ouvindo na porta ${port}`, 'Bootstrap');
}
await bootstrap();
