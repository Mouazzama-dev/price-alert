import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private latestPrice: { timestamp: string; price: string } | null = null;

  constructor(private httpService: HttpService) {
    this.handleCron();  // Trigger an initial fetch immediately when the service is instantiated.
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      if (response.data.ethereum && response.data.ethereum.usd) {
        this.latestPrice = {
          timestamp: new Date().toISOString(),
          price: `1 ETH = ${response.data.ethereum.usd} USD`
        };
        this.logger.log(`Updated Ethereum price: ${this.latestPrice.price}`);
      } else {
        this.logger.error('Ethereum data not found in response', JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Failed to fetch Ethereum prices', error.stack);
    }
  }

  getEthereumPrice(): string {
    if (this.latestPrice) {
      return `${this.latestPrice.timestamp} ${this.latestPrice.price}`;
    } else {
      return 'Price information not available';
    }
  }
}
