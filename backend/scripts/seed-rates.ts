
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CurrencyService } from '../src/currency/currency.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function bootstrap() {
  // Load env vars
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const currencyService = app.get(CurrencyService);

  console.log('Starting manual currency rate initialization...');
  try {
    await currencyService.updateExchangeRates();
    console.log('Currency rates initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize currency rates:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
