import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import type { QuoteShippingRequestDto, QuoteShippingResponseDto } from './dto/quote-shipping.dto.js';
import { SHIPPING_PROVIDER, type ShippingProvider } from './shipping.provider.js';

@Injectable()
export class ShippingService {
  private readonly defaultOrigin: string;

  constructor(
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
    config: ConfigService<Env, true>,
  ) {
    this.defaultOrigin = config.get('SHIPPING_ORIGIN_ZIP', { infer: true });
  }

  async quote(request: QuoteShippingRequestDto): Promise<QuoteShippingResponseDto> {
    const options = await this.provider.quote({
      originZipCode: request.originZipCode ?? this.defaultOrigin,
      destinationZipCode: request.destinationZipCode,
      packages: request.packages,
    });
    return {
      provider: this.provider.name,
      options: options
        .toSorted((a, b) => a.priceCents - b.priceCents)
        .map((o) => ({
          service: o.service,
          price: (o.priceCents / 100).toFixed(2),
          deliveryDays: o.deliveryDays,
        })),
    };
  }
}
