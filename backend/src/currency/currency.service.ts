import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CurrencyExchangeRateEntity } from './currency.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo'; // Free tier demo key
  private readonly API_URL = `https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest/USD`;
  
  // Supported currencies with metadata
  private readonly SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  ];

  // Default rates (1 USD = ...) as a fallback if API fails
  private readonly DEFAULT_RATES: Record<string, number> = {
    USD: 1,
    NGN: 1500,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 150.50,
    CAD: 1.35,
    AUD: 1.52,
    CHF: 0.88,
    CNY: 7.19,
    INR: 83.00,
    ZAR: 19.10,
    BRL: 4.97,
    MXN: 17.05,
  };

  constructor(
    @InjectRepository(CurrencyExchangeRateEntity)
    private currencyRateRepository: Repository<CurrencyExchangeRateEntity>,
  ) {}

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

      // Save rates for supported currencies
      for (const currency of this.SUPPORTED_CURRENCIES) {
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

      this.logger.log(`Successfully updated exchange rates for ${this.SUPPORTED_CURRENCIES.length - 1} currencies`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update exchange rates', error instanceof Error ? error.stack : errorMessage);
      throw error;
    }
  }

  /**
   * Get all supported currencies with their current rates
   */
  async getSupportedCurrencies(): Promise<any[]> {
    const currencies = await Promise.all(
      this.SUPPORTED_CURRENCIES.map(async (currency) => {
        if (currency.code === 'USD') {
          return {
            ...currency,
            rateToUSD: 1,
          };
        }

        const latestRate = await this.currencyRateRepository.findOne({
          where: {
            fromCurrency: 'USD',
            toCurrency: currency.code,
          },
          order: { lastUpdated: 'DESC' },
        });

        return {
          ...currency,
          rateToUSD: latestRate?.rate || this.DEFAULT_RATES[currency.code] || 1,
        };
      }),
    );

    return currencies;
  }

  /**
   * Get current exchange rates for all supported currencies relative to USD
   */
  async getExchangeRates(): Promise<{ baseCurrency: string; rates: Record<string, number>; lastUpdated: Date }> {
    const rates: Record<string, number> = { USD: 1 }; // Base currency
    let lastUpdated = new Date();

    for (const currency of this.SUPPORTED_CURRENCIES) {
      if (currency.code === 'USD') continue;

      const latestRate = await this.currencyRateRepository.findOne({
        where: {
          fromCurrency: 'USD',
          toCurrency: currency.code,
        },
        order: { lastUpdated: 'DESC' },
      });

      if (latestRate) {
        rates[currency.code] = Number(latestRate.rate);
        if (latestRate.lastUpdated > lastUpdated) {
          lastUpdated = latestRate.lastUpdated;
        }
      } else {
        // Fallback to default rates if not in DB
        rates[currency.code] = this.DEFAULT_RATES[currency.code] || 1;
      }
    }

    return {
      baseCurrency: 'USD',
      rates,
      lastUpdated,
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
        convertedAmount: amount * rate,
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
        convertedAmount: amount * rate,
        rate,
      };
    }

    // Cross-currency conversion (via USD)
    const fromRateEntity = await this.currencyRateRepository.findOne({
      where: { fromCurrency: 'USD', toCurrency: fromCurrency },
      order: { lastUpdated: 'DESC' },
    });

    const toRateEntity = await this.currencyRateRepository.findOne({
      where: { fromCurrency: 'USD', toCurrency },
      order: { lastUpdated: 'DESC' },
    });

    if (!fromRateEntity || !toRateEntity) {
      throw new HttpException(
        `Exchange rate not found for conversion`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Convert from source currency to USD, then to target currency
    const amountInUSD = amount / Number(fromRateEntity.rate);
    const convertedAmount = amountInUSD * Number(toRateEntity.rate);
    rate = Number(toRateEntity.rate) / Number(fromRateEntity.rate);

    return {
      convertedAmount,
      rate,
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
