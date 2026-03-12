import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CurrencyService } from '../src/currency/currency.service';
import { CurrencyExchangeRateEntity, CurrencyMetadataEntity } from '../src/currency/currency.entity';
import AppDataSource from '../ormconfig';

async function diagnose() {
  console.log('--- Currency Service Diagnosis ---');
  
  try {
    await AppDataSource.initialize();
    console.log('Database connected.');

    const rateRepo = AppDataSource.getRepository(CurrencyExchangeRateEntity);
    const metaRepo = AppDataSource.getRepository(CurrencyMetadataEntity);
    
    // @ts-ignore
    const service = new CurrencyService(rateRepo, metaRepo);
    
    console.log('Triggering live exchange rate update...');
    await service.updateExchangeRates();
    console.log('Update complete.');

    console.log('Fetching supported currencies via service...');
    const currencies = await service.getSupportedCurrencies();
    
    console.log(`Found ${currencies.length} currencies:`);
    console.log(JSON.stringify(currencies, null, 2));

    const rates = await service.getExchangeRates();
    console.log('Exchange Rates:', JSON.stringify(rates, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Diagnosis failed:', error);
    process.exit(1);
  }
}

diagnose();
