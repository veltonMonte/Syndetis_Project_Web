import { Module } from '@nestjs/common';
import { StubShippingProvider } from './providers/stub-shipping.provider.js';
import { ShippingController } from './shipping.controller.js';
import { SHIPPING_PROVIDER } from './shipping.provider.js';
import { ShippingService } from './shipping.service.js';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, { provide: SHIPPING_PROVIDER, useClass: StubShippingProvider }],
})
export class ShippingModule {}
