import { plainToInstance, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  validateSync,
} from 'class-validator';

/** Eventos publicados pelo core-service. Espelha `OrderStatus` do core. */
export const CORE_EVENT_TYPES = [
  'order.created',
  'order.paid',
  'order.shipped',
  'order.delivered',
  'order.canceled',
] as const;
export type CoreEventType = (typeof CORE_EVENT_TYPES)[number];

export class OrderCustomer {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class OrderEventData {
  @IsUUID()
  orderId: string;

  @IsUUID()
  storeId: string;

  /** Total em reais com 2 casas, ex.: "149.90". */
  @Matches(/^\d+\.\d{2}$/)
  total: string;

  @ValidateNested()
  @Type(() => OrderCustomer)
  customer: OrderCustomer;
}

/** Envelope versionado. Novos campos devem ser opcionais para manter compatibilidade. */
export class CoreEvent {
  @IsUUID()
  id: string;

  @IsIn(CORE_EVENT_TYPES)
  type: CoreEventType;

  @IsISO8601()
  occurredAt: string;

  @IsInt()
  @Min(1)
  version: number;

  @ValidateNested()
  @Type(() => OrderEventData)
  data: OrderEventData;
}

export class InvalidCoreEventError extends Error {}

export function parseCoreEvent(json: string | undefined): CoreEvent {
  if (!json) throw new InvalidCoreEventError('Campo "event" ausente');
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new InvalidCoreEventError('JSON inválido');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidCoreEventError('Envelope deve ser um objeto');
  }
  const event = plainToInstance(CoreEvent, raw);
  const errors = validateSync(event);
  if (errors.length > 0) {
    throw new InvalidCoreEventError(
      errors.map((e) => e.property).join(', ') + ' inválido(s)',
    );
  }
  return event;
}
