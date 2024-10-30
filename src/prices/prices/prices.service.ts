import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly logFilePath = path.resolve(__dirname, 'price.log');
  private latestPrice: { timestamp: string; price: number } | null = null;
  private previousPrice: { timestamp: string; price: number } | null = null;

  constructor(
    private httpService: HttpService,
    private mailerService: MailerService
  ) {
    this.initLogFile();
    this.handleCron(); // Trigger an initial fetch immediately when the service is instantiated.
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
        const currentPrice = response.data.ethereum.usd;
        const timestamp = new Date().toISOString();

        if (this.previousPrice) {
          const priceIncrease = ((currentPrice - this.previousPrice.price) / this.previousPrice.price) * 100;
          if (priceIncrease > 3) {
            this.sendEmailNotification({ timestamp, price: currentPrice });
          }
        }

        this.previousPrice = this.latestPrice;
        this.latestPrice = { timestamp, price: currentPrice };

        this.logger.log(`Updated Ethereum price: 1 ETH = ${currentPrice} USD`);
        this.writePriceToFile(this.latestPrice);
      } else {
        this.logger.error('Ethereum data not found in response', JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Failed to fetch Ethereum prices', error.stack);
    }
  }

  writePriceToFile(priceData: { timestamp: string; price: number }) {
    const logEntry = `${priceData.timestamp} - 1 ETH = ${priceData.price} USD\n`;
    try {
      fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
      this.logger.log(`Price logged to file: ${logEntry.trim()}`);
    } catch (error) {
      this.logger.error(`Failed to write to log file: ${error.message}`);
    }
  }

  async sendEmailNotification(priceData: { timestamp: string; price: number }) {
    try {
      await this.mailerService.sendMail({
        to: 'mouzzama.umer@gmail.com',
        subject: 'Ethereum Price Update',
        text: `The latest Ethereum price is: 1 ETH = ${priceData.price} USD at ${priceData.timestamp}`,
      });
      this.logger.log('Price notification email sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send price notification email: ${error.message}`);
    }
  }

  getEthereumPrice(): string {
    if (this.latestPrice) {
      return `${this.latestPrice.timestamp} 1 ETH = ${this.latestPrice.price} USD`;
    } else {
      return 'Price information not available';
    }
  }
}
