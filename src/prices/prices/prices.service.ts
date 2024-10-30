import { Injectable } from '@nestjs/common';

// @Injectable()
// export class PricesService {}

@Injectable()
export class PricesService {
  getEthereumPrices() : string{
    
        return '1 ETH = 1000 USD';
    // Fetch the Ethereum prices from an API
  }
}
