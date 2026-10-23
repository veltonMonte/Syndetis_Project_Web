export interface ShippingPackage {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
}

export interface ShippingQuoteRequest {
  originZipCode: string;
  destinationZipCode: string;
  packages: ShippingPackage[];
}

export interface ShippingOption {
  service: string;
  /** Centavos, para evitar erro de ponto flutuante. */
  priceCents: number;
  deliveryDays: number;
}

export interface ShippingProvider {
  readonly name: string;
  quote(request: ShippingQuoteRequest): Promise<ShippingOption[]>;
}

export const SHIPPING_PROVIDER = Symbol('SHIPPING_PROVIDER');
