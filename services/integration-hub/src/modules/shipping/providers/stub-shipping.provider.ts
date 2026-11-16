import { Injectable } from '@nestjs/common';
import type {
  ShippingOption,
  ShippingProvider,
  ShippingQuoteRequest,
} from '../shipping.provider.js';

/** Divisor de peso cúbico usado pelos Correios (cm³ → kg). */
const CUBIC_DIVISOR = 6000;

/**
 * Stub determinístico: calcula valores plausíveis sem chamar API externa.
 * Mesma entrada sempre gera a mesma saída, o que facilita testes do checkout.
 * TODO: implementar CorreiosShippingProvider e trocar o binding em ShippingModule.
 */
@Injectable()
export class StubShippingProvider implements ShippingProvider {
  readonly name = 'stub';

  quote(request: ShippingQuoteRequest): Promise<ShippingOption[]> {
    const billableKg = Math.max(1, Math.ceil(this.billableWeightKg(request)));
    // Distância aproximada pela região do CEP (primeiro dígito), de 0 a 9.
    const regionDistance = Math.abs(
      Number(request.originZipCode[0]) - Number(request.destinationZipCode[0]),
    );

    const pacCents = 1_500 + billableKg * 450 + regionDistance * 300;
    const sedexCents = Math.round(pacCents * 1.8);

    return Promise.resolve([
      { service: 'PAC', priceCents: pacCents, deliveryDays: 5 + regionDistance },
      { service: 'SEDEX', priceCents: sedexCents, deliveryDays: 1 + Math.ceil(regionDistance / 2) },
    ]);
  }

  private billableWeightKg(request: ShippingQuoteRequest): number {
    return request.packages.reduce((total, pkg) => {
      const realKg = pkg.weightGrams / 1000;
      const cubicKg = (pkg.lengthCm * pkg.widthCm * pkg.heightCm) / CUBIC_DIVISOR;
      return total + Math.max(realKg, cubicKg) * pkg.quantity;
    }, 0);
  }
}
