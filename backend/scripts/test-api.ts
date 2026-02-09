
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CurrencyService } from '../src/currency/currency.service';

async function testApi() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const currencyService = app.get(CurrencyService);

  console.log('Testing getSupportedCurrencies()...');
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    console.log('Currencies returned:', JSON.stringify(currencies, null, 2));
  } catch (error) {
    console.error('API call failed:', error);
  } finally {
    await app.close();
  }
}

testApi(); 