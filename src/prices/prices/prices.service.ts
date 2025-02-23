import { Injectable, Logger, Controller, Post, Body, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { CryptoPrice } from './crypto-price.entity';
import { Repository } from 'typeorm';

interface PriceAlert {
  chain: string;
  price: number;
  email: string;
}

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly logFilePath = path.resolve(__dirname, 'price.log');
  private latestPrice: { timestamp: string; price: number } | null = null;
  private previousPrice: { timestamp: string; price: number } | null = null;
  private priceAlerts: PriceAlert[] = [];
  private priceHistory: { timestamp: string; price: number }[] = [];

  constructor(
    private httpService: HttpService,
    private mailerService: MailerService,
    @InjectRepository(CryptoPrice)
    private cryptoPriceRepository: Repository<CryptoPrice>,
  ) {
    this.initLogFile();
    this.handleCron(); // Trigger an initial fetch immediately when the service is instantiated.
    this.handleCron2();
  }

  private initLogFile() {
    // Ensure the directory exists
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.logger.log(`Log file initialized at: ${this.logFilePath}`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron2() {
    await this.fetchAndSavePrice('ethereum', 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    await this.fetchAndSavePrice('matic-network', 'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd');
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

        this.checkPriceAlerts(currentPrice);

        this.previousPrice = this.latestPrice;
        this.latestPrice = { timestamp, price: currentPrice };

        // Maintain price history for the last 24 hours
        this.priceHistory.push(this.latestPrice);
        if (this.priceHistory.length > 24) {
          this.priceHistory.shift();
        }

        this.logger.log(`Updated Ethereum price: 1 ETH = ${currentPrice} USD`);
        // this.writePriceToFile(this.latestPrice);
      } else {
        this.logger.error('Ethereum data not found in response', JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Failed to fetch Ethereum prices', error.stack);
    }
  }

  // writePriceToFile(priceData: { timestamp: string; price: number }) {
  //   const logEntry = `${priceData.timestamp} - 1 ETH = ${priceData.price} USD\n`;
  //   try {
  //     fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
  //     this.logger.log(`Price logged to file: ${logEntry.trim()}`);
  //   } catch (error) {
  //     this.logger.error(`Failed to write to log file: ${error.message}`);
  //   }
  // }

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

  async sendPriceAlertEmail(alert: PriceAlert, price: number) {
    try {
      await this.mailerService.sendMail({
        to: alert.email,
        subject: `${alert.chain} Price Alert`,
        text: `The price of ${alert.chain} has reached your target of ${alert.price} USD. Current price: ${price} USD.`,
      });
      this.logger.log(`Price alert email sent to ${alert.email} for ${alert.chain} at price ${price} USD`);
    } catch (error) {
      this.logger.error(`Failed to send price alert email: ${error.message}`);
    }
  }

  checkPriceAlerts(currentPrice: number) {
    for (const alert of this.priceAlerts) {
      if (alert.chain === 'ethereum' && currentPrice >= alert.price) {
        this.sendPriceAlertEmail(alert, currentPrice);
      }
    }
  }

  addPriceAlert(chain: string, price: number, email: string) {
    this.priceAlerts.push({ chain, price, email });
    this.logger.log(`Added price alert for ${chain} at ${price} USD to be sent to ${email}`);
  }

  async getEthereumPrices(): Promise<string> {
    // Fetching data for the last 2 days to ensure hourly data without specifying 'interval'
    const url = 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=2';
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const priceData = response.data.prices;  // This will be an array of [timestamp, price] arrays
      const last24HoursPrices = priceData.slice(-24); // Assuming the data contains more than 24 entries
      return last24HoursPrices.map(price => `Time: ${new Date(price[0]).toLocaleString()}, Price: ${price[1]} USD`).join('\n');
    } catch (error) {
      return 'Failed to fetch Ethereum prices';
    }
  }

  async getPolygonPrices(): Promise<string> {
    const url = 'https://api.coingecko.com/api/v3/coins/matic-network/market_chart?vs_currency=usd&days=2';
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const priceData = response.data.prices;  // This is an array of [timestamp, price] arrays
      const last24HoursPrices = priceData.slice(-24);  // Get the last 24 entries
      return last24HoursPrices.map(price => `Time: ${new Date(price[0]).toLocaleString()}, Price: ${price[1]} USD`).join('\n');
    } catch (error) {
      return 'Failed to fetch Polygon prices';
    }
  }

  async getSwapRate(amount: number): Promise<string> {
    const feePercentage = 0.03;  // 3% fee
    try {
      // Fetching current prices of Ethereum and Bitcoin in USD
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd';
      const response = await lastValueFrom(this.httpService.get(url));
      const ethPriceUSD = response.data.ethereum.usd;
      const btcPriceUSD = response.data.bitcoin.usd;

      // Calculate how much BTC can be bought with the specified amount of ETH
      const ethTotal = amount * ethPriceUSD;
      const equivalentBTC = ethTotal / btcPriceUSD;

      // Calculate fees in ETH and USD
      const feeInUSD = ethTotal * feePercentage;
      const feeInETH = feeInUSD / ethPriceUSD;

      return `With ${amount} ETH, you can get approximately ${equivalentBTC.toFixed(8)} BTC. Total Fee: ${feeInETH.toFixed(8)} ETH (${feeInUSD.toFixed(2)} USD).`;
    } catch (error) {
      this.logger.error('Failed to fetch cryptocurrency prices', error.stack);
      return 'Failed to fetch swap rate';
    }
  }

  private async fetchAndSavePrice(chain: string, url: string) {
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      if (response.data[chain] && response.data[chain].usd) {
        const currentPrice = response.data[chain].usd;
        const timestamp = new Date();
        
        // Log the price to the console
        this.logger.log(`Fetched ${chain} price: 1 ${chain.toUpperCase()} = ${currentPrice} USD at ${timestamp}`);

        // Create and save the price entity
        const price = this.cryptoPriceRepository.create({
          chain,
          price: currentPrice,
          timestamp
        });
        await this.cryptoPriceRepository.save(price);
      } else {
        this.logger.error(`${chain} data not found in response`, JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error(`Failed to fetch ${chain} prices`, error.stack);
    }
  }
  
}

