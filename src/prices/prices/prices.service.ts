import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly logFilePath = path.resolve(__dirname, 'price.log');
  private latestPrice: { timestamp: string; price: string } | null = null;

  constructor(private httpService: HttpService) {
    this.initLogFile();
    this.handleCron();  // Trigger an initial fetch immediately when the service is instantiated.
  }

  private initLogFile() {
    // Ensure the directory exists
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.logger.log(`Log file initialized at: ${this.logFilePath}`);
  }

  @Cron(CronExpression.EVERY_HOUR)
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
        this.writePriceToFile(this.latestPrice);
      } else {
        this.logger.error('Ethereum data not found in response', JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Failed to fetch Ethereum prices', error.stack);
    }
  }

  writePriceToFile(priceData: { timestamp: string; price: string }) {
    const logEntry = `${priceData.timestamp} - ${priceData.price}\n`;
    try {
      fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
      this.logger.log(`Price logged to file: ${logEntry.trim()}`);
    } catch (error) {
      this.logger.error(`Failed to write to log file: ${error.message}`);
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
