import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PricesController } from './prices/prices.controller';
import { PricesService } from './prices/prices.service';

@Module({
  imports: [ScheduleModule.forRoot(), HttpModule],
  controllers: [PricesController],
  providers: [PricesService]
})
export class PricesModule {}
