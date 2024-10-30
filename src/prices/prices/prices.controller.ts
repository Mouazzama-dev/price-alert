import { Body, Controller, Get, Post } from '@nestjs/common';
import { PricesService } from './prices.service';

// @Controller('prices')
// export class PricesController {}

@Controller('prices')
export class PricesController {
  constructor(private pricesService: PricesService) {}


  @Post('alert')
  addPriceAlert(@Body() body: { chain: string; price: number; email: string }) {
    this.pricesService.addPriceAlert(body.chain, body.price, body.email);
    return { message: 'Price alert added successfully' };
  }

  @Get('/ethereum')
  getEthereumPrices() {
    return this.pricesService.getEthereumPrices();
  }

  @Get('/polygon')
  async getPolygonPrice(): Promise<string> {
    return this.pricesService.getPolygonPrices();
  }

}

