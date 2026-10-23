import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiAcceptedResponse, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';
import type { Request } from 'express';
import { parseWebhookSecrets, type Env } from '../../config/env.validation.js';
import { QUEUES } from '../../config/queues.js';
import { Public } from '../../middleware/auth/auth.decorators.js';
import type { WebhookJob } from './webhook-job.js';
import { isValidSignature, SIGNATURE_HEADER } from './webhook-signature.js';

const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Entrada de webhooks de provedores externos (pagamentos, Correios, WhatsApp...).
 * Não usa JWT: cada provedor autentica com HMAC do corpo. A resposta é imediata (202)
 * e o processamento acontece na fila `webhooks`.
 */
@ApiTags('webhooks')
@Public()
@Controller('webhooks')
export class WebhooksController {
  private readonly secrets: Map<string, string>;

  constructor(
    @InjectQueue(QUEUES.WEBHOOKS) private readonly queue: Queue<WebhookJob>,
    config: ConfigService<Env, true>,
  ) {
    this.secrets = parseWebhookSecrets(config.get('WEBHOOK_SECRETS', { infer: true }));
  }

  @Post(':provider')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: SIGNATURE_HEADER, description: 'sha256=<hmac hex do corpo>' })
  @ApiHeader({ name: 'x-event-id', required: false, description: 'Usado para deduplicar' })
  @ApiAcceptedResponse()
  async receive(
    @Param('provider') provider: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers(SIGNATURE_HEADER) signature: string | undefined,
    @Headers('x-event-id') eventId: string | undefined,
    @Body() payload: unknown,
  ): Promise<{ accepted: true }> {
    const secret = this.secrets.get(provider.toLowerCase());
    if (!secret) {
      throw new NotFoundException(
        `Provedor de webhook desconhecido: '${provider}' não está cadastrado nas configurações do sistema`,
      );
    }

    if (!request.rawBody || !isValidSignature(secret, request.rawBody, signature)) {
      throw new UnauthorizedException(
        `Assinatura inválida: o cabeçalho '${SIGNATURE_HEADER}' está ausente ou a chave HMAC SHA-256 não confere com o corpo recebido`,
      );
    }

    const validEventId = eventId && EVENT_ID_PATTERN.test(eventId) ? eventId : undefined;
    await this.queue.add(
      provider,
      { provider, eventId: validEventId, receivedAt: new Date().toISOString(), payload },
      // Mesmo evento reenviado pelo provedor não gera um segundo job.
      { jobId: validEventId ? `${provider}-${validEventId}` : undefined },
    );
    return { accepted: true };
  }
}
