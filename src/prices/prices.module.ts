import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PricesController } from './prices/prices.controller';
import { PricesService } from './prices/prices.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoPrice } from './prices/crypto-price.entity';

@Module({
  imports: [
      TypeOrmModule.forRoot({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'abcd@1234',
        database: 'token_prices',
        entities: [CryptoPrice],
        synchronize: true,
    }),

    MailerModule.forRoot({
      transport: {
        host: 'sandbox.smtp.mailtrap.io', // Replace with your SMTP host
        port: 25,
        auth: {
          user: '97a3fe8bc8ef4c', // Replace with your email
          pass: '8124803d28d09b',    // Replace with your email password
        },
      },
      defaults: {
        from: '"No Reply" <no-reply@example.com>', // Replace with a default sender address
      },
    }),
    ScheduleModule.forRoot(), 
    HttpModule, 
    TypeOrmModule.forFeature([CryptoPrice])  // Register the repository
  ],
  controllers: [PricesController],
  providers: [PricesService]
})
export class PricesModule {}
