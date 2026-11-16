import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { QuoteShippingRequestDto, QuoteShippingResponseDto } from './dto/quote-shipping.dto.js';
import { ShippingService } from './shipping.service.js';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Post('quotes')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: QuoteShippingResponseDto })
  quote(@Body() request: QuoteShippingRequestDto): Promise<QuoteShippingResponseDto> {
    return this.shipping.quote(request);
  }
}
