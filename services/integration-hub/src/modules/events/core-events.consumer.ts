import { hostname } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import type { Env } from '../../config/env.validation.js';
import { REDIS_CLIENT } from '../../config/redis.module.js';
import { InvalidCoreEventError, parseCoreEvent } from './core-event.js';
import { NotificationDispatcher } from './notification.dispatcher.js';

type StreamEntry = [id: string, fields: string[]];
type StreamReadReply = [stream: string, entries: StreamEntry[]][] | null;

/**
 * Consome o Redis Stream publicado pelo core-service (padrão outbox).
 *
 * Usamos Stream em vez de BullMQ na fronteira porque o core é Kotlin e só precisa de
 * um `XADD` — BullMQ é um protocolo específico de Node. Dentro do hub, cada evento vira
 * jobs BullMQ (com retry/backoff). Entrega é "pelo menos uma vez": só damos XACK depois
 * de enfileirar, e os jobs usam o id do evento como jobId para não duplicar.
 */
@Injectable()
export class CoreEventsConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CoreEventsConsumer.name);
  private readonly enabled: boolean;
  private readonly stream: string;
  private readonly group: string;
  private readonly consumer = hostname();
  private reader?: Redis;
  private running = false;
  private loop?: Promise<void>;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dispatcher: NotificationDispatcher,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('CORE_EVENTS_ENABLED', { infer: true });
    this.stream = config.get('CORE_EVENTS_STREAM', { infer: true });
    this.group = config.get('CORE_EVENTS_GROUP', { infer: true });
  }

  get deadLetterStream(): string {
    return `${this.stream}:dead`;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Consumo de eventos do core desabilitado (CORE_EVENTS_ENABLED=false)');
      return;
    }
    await this.ensureGroup();
    // XREADGROUP com BLOCK prende a conexão; por isso uma conexão dedicada.
    this.reader = this.redis.duplicate();
    this.running = true;
    this.loop = this.run();
    this.logger.log(`Consumindo ${this.stream} (grupo ${this.group}, consumidor ${this.consumer})`);
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    this.reader?.disconnect();
    await this.loop;
  }

  /** Processa uma entrada do stream. Retorna `false` se ela deve continuar pendente. */
  async handle(id: string, fields: string[]): Promise<boolean> {
    const values = toRecord(fields);
    try {
      const event = parseCoreEvent(values.event);
      await this.dispatcher.dispatch(event);
    } catch (error) {
      if (error instanceof InvalidCoreEventError) {
        // Mensagem malformada nunca vai dar certo: vai para o dead-letter e é confirmada.
        this.logger.warn(`Evento ${id} inválido: ${error.message}`);
        await this.redis.xadd(this.deadLetterStream, '*', ...fields, 'error', error.message, 'sourceId', id);
      } else {
        this.logger.error(`Falha ao processar evento ${id}; ficará pendente`, (error as Error).stack);
        return false;
      }
    }
    await this.redis.xack(this.stream, this.group, id);
    return true;
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', this.stream, this.group, '$', 'MKSTREAM');
    } catch (error) {
      if (!(error as Error).message.includes('BUSYGROUP')) throw error;
    }
  }

  private async run(): Promise<void> {
    // Primeiro reprocessa o que ficou pendente para este consumidor ('0'), depois só novos ('>').
    let cursor = '0';
    while (this.running) {
      try {
        const reply = (await this.reader!.xreadgroup(
          'GROUP', this.group, this.consumer,
          'COUNT', 10, 'BLOCK', 5000,
          'STREAMS', this.stream, cursor,
        )) as StreamReadReply;
        const entries = reply?.[0]?.[1] ?? [];

        let allHandled = true;
        for (const [id, fields] of entries) {
          allHandled = (await this.handle(id, fields)) && allHandled;
        }
        // Evita loop quente re-lendo pendentes que continuam falhando.
        if (cursor === '0' && (entries.length === 0 || !allHandled)) cursor = '>';
      } catch (error) {
        if (!this.running) break;
        this.logger.error(`Erro lendo ${this.stream}: ${(error as Error).message}`);
        await sleep(1000);
      }
    }
  }
}

function toRecord(fields: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) record[fields[i]] = fields[i + 1];
  return record;
}
