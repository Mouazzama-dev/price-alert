import { Module } from '@nestjs/common';
import { PricesController } from './prices/prices.controller';
import { PricesService } from './prices/prices.service';

@Module({
  controllers: [PricesController],
  providers: [PricesService]
})
export class PricesModule {}
