import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CurrencyExchangeRateEntity,
  CurrencyMetadataEntity,
} from "./currency.entity";
import { Cron, CronExpression } from "@nestjs/schedule";

interface ExchangeRateResponse {
  result: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
}

export interface SafeConversion {
  value: number;
  /** False when no rate existed — value is the unconverted amount. */
  converted: boolean;
}

/**
 * Pure, non-throwing currency conversion over a getUsdRateMap() map.
 * Same-currency and USD passthrough never need a rate. Anything missing
 * a rate returns the raw amount with `converted: false` so callers can
 * degrade per-row (warn) instead of failing whole aggregations.
 */
export function convertWithMap(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): SafeConversion {
  if (!Number.isFinite(amount)) return { value: 0, converted: true };
  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  if (from === to) return { value: amount, converted: true };
  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (!fromRate || !toRate) return { value: amount, converted: false };
  return { value: (amount / fromRate) * toRate, converted: true };
}

export interface NormalizedSum {
  total: number;
  warnings: string[];
}

/**
 * Sums mixed-currency line items into a base currency. Rows lacking a rate
 * are added unconverted and reported in `warnings` — aggregations degrade
 * per-row instead of failing whole requests.
 */
export function sumInBase(
  items: Array<{ amount: any; currency?: string | null }>,
  baseCurrency: string,
  rates: Record<string, number>,
): NormalizedSum {
  const warnings = new Set<string>();
  let total = 0;
  for (const item of items) {
    const { value, converted } = convertWithMap(
      Number(item.amount) || 0,
      item.currency || "USD",
      baseCurrency,
      rates,
    );
    if (!converted && item.currency) {
      warnings.add(String(item.currency).toUpperCase());
    }
    total += value;
  }
  return { total: Math.round(total * 100) / 100, warnings: [...warnings] };
}

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY || "demo"; // Free tier demo key
  private readonly API_URL = `https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest/USD`;

  private cache: {
    data: any[] | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };
  private readonly CACHE_TTL_MS = 3600000; // 1 hour - per ARCH-005 FX cache, balances freshness vs DB load

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
    this.logger.log(
      "CurrencyService initializing — checking exchange rates...",
    );
    await this.initializeRates();
  }

  /**
   * Scheduled job to update exchange rates daily at 2 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateExchangeRates(): Promise<void> {
    this.logger.log("Starting scheduled exchange rate update...");

    try {
      const response = await fetch(this.API_URL);

      if (!response.ok) {
        throw new HttpException(
          `Exchange rate API returned ${response.status}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data = (await response.json()) as ExchangeRateResponse;

      if (data.result !== "success") {
        throw new HttpException(
          "Failed to fetch exchange rates from API",
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const rates = data.conversion_rates;
      const lastUpdated = new Date(data.time_last_update_unix * 1000);

      // Get active supported currencies from metadata table
      const supportedCurrencies = await this.currencyMetadataRepository.find({
        where: { isActive: true },
      });

      // Save rates for supported currencies
      for (const currency of supportedCurrencies) {
        if (currency.code === "USD") continue; // Skip USD to USD

        const rate = rates[currency.code];
        if (!rate) {
          this.logger.warn(`Rate not found for ${currency.code}, skipping...`);
          continue;
        }

        await this.currencyRateRepository.upsert(
          {
            fromCurrency: "USD",
            toCurrency: currency.code,
            rate,
            lastUpdated,
            source: "ExchangeRate-API",
          },
          ["fromCurrency", "toCurrency", "lastUpdated"],
        );
      }

      // Invalidate cache after update
      this.cache = { data: null, timestamp: 0 };
      this.logger.log(`Successfully updated exchange rates from API.`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary FX API failed (${errorMessage}), trying ECB fallback...`,
      );
      try {
        await this.fetchFromECB();
        this.logger.log(`ECB fallback succeeded`);
        return;
      } catch (ecbError) {
        this.logger.error(
          "Failed to update exchange rates from API and ECB fallback",
          ecbError instanceof Error ? ecbError.stack : String(ecbError),
        );
      }
      // We no longer rely on hardcoded fallback seeding here because the migration
      // seeds metadata and initializeRates() handles initial empty state.
    }
  }

  private async fetchFromECB(): Promise<void> {
    // ECB eurofxref-daily.xml fallback - parse via exchangerate.host (JSON wrapper for ECB)
    const ecbUrl = `https://api.exchangerate.host/latest?base=USD`;
    const response = await fetch(ecbUrl);
    if (!response.ok) throw new Error(`ECB API ${response.status}`);
    const data: any = await response.json();
    const rates = data.rates || data.conversion_rates;
    if (!rates) throw new Error("ECB no rates");
    const lastUpdated = data.date ? new Date(data.date) : new Date();
    const supported = await this.currencyMetadataRepository.find({ where: { isActive: true } });
    for (const cur of supported) {
      if (cur.code === "USD") continue;
      const rate = rates[cur.code];
      if (!rate) continue;
      await this.currencyRateRepository.upsert(
        { fromCurrency: "USD", toCurrency: cur.code, rate, lastUpdated, source: "ECB" },
        ["fromCurrency", "toCurrency", "lastUpdated"],
      );
    }
    this.cache = { data: null, timestamp: 0 };
  }

  /**
   * Get all supported currencies with their current rates.
   * Optimized with 5-minute in-memory cache and batch query.
   */
  async getSupportedCurrencies(): Promise<any[]> {
    // 1. Check Cache
    const now = Date.now();
    if (this.cache.data && now - this.cache.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(
        "[getSupportedCurrencies] Returning cached currency rates",
      );
      return this.cache.data;
    }

    this.logger.log(
      "[getSupportedCurrencies] Cache miss. Fetching rates from DB...",
    );

    // 2. Fetch all metadata and latest rates
    const [metadata, allRates] = await Promise.all([
      this.currencyMetadataRepository.find({ where: { isActive: true } }),
      this.currencyRateRepository.find({
        where: { fromCurrency: "USD" },
        order: { lastUpdated: "DESC" },
      }),
    ]);

    // Group by toCurrency and take the latest for each
    const latestRatesMap = new Map<string, number>();
    allRates.forEach((r) => {
      if (!latestRatesMap.has(r.toCurrency)) {
        latestRatesMap.set(r.toCurrency, Number(r.rate));
      }
    });

    const currencies = metadata.map((currency) => {
      if (currency.code === "USD") {
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
  async getExchangeRates(): Promise<{
    baseCurrency: string;
    rates: Record<string, number>;
    lastUpdated: Date;
  }> {
    const supported = await this.getSupportedCurrencies();
    const rates: Record<string, number> = {};

    supported.forEach((c) => {
      rates[c.code] = c.rateToUSD;
    });

    return {
      baseCurrency: "USD",
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
    if (fromCurrency === "USD") {
      const rateEntity = await this.currencyRateRepository.findOne({
        where: { fromCurrency: "USD", toCurrency },
        order: { lastUpdated: "DESC" },
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
    if (toCurrency === "USD") {
      const rateEntity = await this.currencyRateRepository.findOne({
        where: { fromCurrency: "USD", toCurrency: fromCurrency },
        order: { lastUpdated: "DESC" },
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
        where: { fromCurrency: "USD", toCurrency: fromCurrency },
        order: { lastUpdated: "DESC" },
      }),
      this.currencyRateRepository.findOne({
        where: { fromCurrency: "USD", toCurrency },
        order: { lastUpdated: "DESC" },
      }),
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
   * Bulk rate map for server-side aggregation: `{ CODE: unitsPerUsd }`
   * (i.e. 1 USD = N units — same convention as the frontend rate map).
   * Takes the latest stored rate per USD→X pair. Never throws — returns
   * whatever is available; callers degrade per-row via convertWithMap().
   */
  async getUsdRateMap(): Promise<Record<string, number>> {
    try {
      const rows = await this.currencyRateRepository
        .createQueryBuilder("r")
        .select("r.toCurrency", "code")
        .addSelect("r.rate", "rate")
        .addSelect("MAX(r.lastUpdated)", "lastUpdated")
        .where("r.fromCurrency = :usd", { usd: "USD" })
        .groupBy("r.toCurrency")
        .addGroupBy("r.rate")
        .orderBy("lastUpdated", "DESC")
        .getRawMany();
      const map: Record<string, number> = { USD: 1 };
      for (const row of rows) {
        const rate = Number(row.rate);
        if (row.code && Number.isFinite(rate) && rate > 0 && map[row.code] === undefined) {
          // First row per code wins (ordered by latest); GROUP BY+rate keeps
          // Postgres happy while the ORDER picks the freshest row first.
          map[String(row.code).toUpperCase()] = rate;
        }
      }
      return map;
    } catch (err) {
      this.logger.warn(
        `getUsdRateMap failed, aggregation will skip conversion: ${(err as Error).message}`,
      );
      return { USD: 1 };
    }
  }

  /**
   * Initialize rates on first run (manual trigger)
   */
  async initializeRates(): Promise<void> {
    const existingRates = await this.currencyRateRepository.count();

    if (existingRates === 0) {
      this.logger.log("No existing rates found. Initializing...");
      await this.updateExchangeRates();
    } else {
      this.logger.log(
        `Found ${existingRates} existing rates. Skipping initialization.`,
      );
    }
  }
}
