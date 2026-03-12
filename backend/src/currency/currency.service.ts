import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyExchangeRateEntity, CurrencyMetadataEntity } from './currency.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo'; // Free tier demo key
  private readonly API_URL = `https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest/USD`;
  
  private cache: {
    data: any[] | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor(
    @InjectRepository(CurrencyExchangeRateEntity)
    private currencyRateRepository: Repository<CurrencyExchangeRateEntity>,
    @InjectRepository(CurrencyMetadataEntity)
    private currencyMetadataRepository: Repository<CurrencyMetadataEntity>,
  ) {}

  /**
   * Lifecycle hook: seed exchange rates on startup if the DB table is empty.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('CurrencyService initializing — checking exchange rates...');
    await this.initializeRates();
  }

  /**
   * Scheduled job to update exchange rates daily at 2 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateExchangeRates(): Promise<void> {
    this.logger.log('Starting scheduled exchange rate update...');
    
    try {
      const response = await fetch(this.API_URL);
      
      if (!response.ok) {
        throw new HttpException(
          `Exchange rate API returned ${response.status}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data = await response.json();

      if (data.result !== 'success') {
        throw new HttpException(
          'Failed to fetch exchange rates from API',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const rates = data.conversion_rates;
      const lastUpdated = new Date(data.time_last_update_unix * 1000);

      // Get active supported currencies from metadata table
      const supportedCurrencies = await this.currencyMetadataRepository.find({
        where: { isActive: true }
      });

      // Save rates for supported currencies
      for (const currency of supportedCurrencies) {
        if (currency.code === 'USD') continue; // Skip USD to USD

        const rate = rates[currency.code];
        if (!rate) {
          this.logger.warn(`Rate not found for ${currency.code}, skipping...`);
          continue;
        }

        await this.currencyRateRepository.upsert(
          {
            fromCurrency: 'USD',
            toCurrency: currency.code,
            rate,
            lastUpdated,
            source: 'ExchangeRate-API',
          },
          ['fromCurrency', 'toCurrency', 'lastUpdated'],
        );
      }

      // Invalidate cache after update
      this.cache = { data: null, timestamp: 0 };
      this.logger.log(`Successfully updated exchange rates from API.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update exchange rates from API', error instanceof Error ? error.stack : errorMessage);
      
      // We no longer rely on hardcoded fallback seeding here because the migration 
      // seeds metadata and initializeRates() handles initial empty state.
    }
  }

  /**
   * Get all supported currencies with their current rates.
   * Optimized with 5-minute in-memory cache and batch query.
   */
  async getSupportedCurrencies(): Promise<any[]> {
    // 1. Check Cache
    const now = Date.now();
    if (this.cache.data && (now - this.cache.timestamp < this.CACHE_TTL_MS)) {
      this.logger.debug('[getSupportedCurrencies] Returning cached currency rates');
      return this.cache.data;
    }

    this.logger.log('[getSupportedCurrencies] Cache miss. Fetching rates from DB...');
    
    // 2. Fetch all metadata and latest rates
    const [metadata, allRates] = await Promise.all([
      this.currencyMetadataRepository.find({ where: { isActive: true } }),
      this.currencyRateRepository.find({
        where: { fromCurrency: 'USD' },
        order: { lastUpdated: 'DESC' },
      })
    ]);

    // Group by toCurrency and take the latest for each
    const latestRatesMap = new Map<string, number>();
    allRates.forEach(r => {
      if (!latestRatesMap.has(r.toCurrency)) {
        latestRatesMap.set(r.toCurrency, Number(r.rate));
      }
    });

    const currencies = metadata.map((currency) => {
      if (currency.code === 'USD') {
        return { ...currency, rateToUSD: 1 };
      }

      // Default to 1 if no rate found (should not happen for supported ones)
      const rate = latestRatesMap.get(currency.code) || 1;
      return {
        ...currency,
        rateToUSD: rate,
      };
    });

    // 3. Update Cache
    this.cache = { data: currencies, timestamp: now };
    return currencies;
  }

  /**
   * Get current exchange rates for all supported currencies relative to USD
   */
  async getExchangeRates(): Promise<{ baseCurrency: string; rates: Record<string, number>; lastUpdated: Date }> {
    const supported = await this.getSupportedCurrencies();
    const rates: Record<string, number> = {};
    
    supported.forEach(c => {
      rates[c.code] = c.rateToUSD;
    });

    return {
      baseCurrency: 'USD',
      rates,
      lastUpdated: new Date(this.cache.timestamp),
    };
  }

  /**
   * Convert an amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ convertedAmount: number; rate: number }> {
    if (amount === 0) return { convertedAmount: 0, rate: 1 };
    
    // Same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1 };
    }

    let rate = 1;

    // Direct conversion from USD
    if (fromCurrency === 'USD') {
      const rateEntity = await this.currencyRateRepository.findOne({
        where: { fromCurrency: 'USD', toCurrency },
        order: { lastUpdated: 'DESC' },
      });

      if (!rateEntity) {
        throw new HttpException(
          `Exchange rate not found for ${toCurrency}`,
          HttpStatus.NOT_FOUND,
        );
      }

      rate = Number(rateEntity.rate);
      return {
        convertedAmount: Number((amount * rate).toFixed(6)),
        rate,
      };
    }

    // Direct conversion to USD
    if (toCurrency === 'USD') {
      const rateEntity = await this.currencyRateRepository.findOne({
        where: { fromCurrency: 'USD', toCurrency: fromCurrency },
        order: { lastUpdated: 'DESC' },
      });

      if (!rateEntity) {
        throw new HttpException(
          `Exchange rate not found for ${fromCurrency}`,
          HttpStatus.NOT_FOUND,
        );
      }

      rate = 1 / Number(rateEntity.rate);
      return {
        convertedAmount: Number((amount * rate).toFixed(6)),
        rate,
      };
    }

    // Cross-currency conversion (via USD)
    const [fromRateEntity, toRateEntity] = await Promise.all([
      this.currencyRateRepository.findOne({
        where: { fromCurrency: 'USD', toCurrency: fromCurrency },
        order: { lastUpdated: 'DESC' },
      }),
      this.currencyRateRepository.findOne({
        where: { fromCurrency: 'USD', toCurrency },
        order: { lastUpdated: 'DESC' },
      })
    ]);

    if (!fromRateEntity || !toRateEntity) {
      throw new HttpException(
        `Exchange rate not found for conversion between ${fromCurrency} and ${toCurrency}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Convert from source currency to USD, then to target currency
    const amountInUSD = amount / Number(fromRateEntity.rate);
    const convertedAmount = amountInUSD * Number(toRateEntity.rate);
    rate = Number(toRateEntity.rate) / Number(fromRateEntity.rate);

    return {
      convertedAmount: Number(convertedAmount.toFixed(6)),
      rate: Number(rate.toFixed(10)),
    };
  }

  /**
   * Initialize rates on first run (manual trigger)
   */
  async initializeRates(): Promise<void> {
    const existingRates = await this.currencyRateRepository.count();
    
    if (existingRates === 0) {
      this.logger.log('No existing rates found. Initializing...');
      await this.updateExchangeRates();
    } else {
      this.logger.log(`Found ${existingRates} existing rates. Skipping initialization.`);
    }
  }
}
