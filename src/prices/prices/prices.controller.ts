import { Controller, Get } from '@nestjs/common';
import { PricesService } from './prices.service';

// @Controller('prices')
// export class PricesController {}

@Controller('prices')
export class PricesController {
  constructor(private pricesService: PricesService) {}

  @Get('/ethereum')
  getEthereumPrices() {
    return this.pricesService.getEthereumPrice();
  }
}

