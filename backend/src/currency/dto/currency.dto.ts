export interface GetSupportedCurrenciesDto {
  currencies: Array<{
    code: string;
    name: string;
    symbol: string;
    rateToUSD?: number;
  }>;
}

export interface GetExchangeRatesDto {
  baseCurrency: string; // Always 'USD'
  rates: Record<string, number>; // { 'NGN': 1580.5, 'EUR': 0.92, ... }
  lastUpdated: Date;
}

export interface ConvertCurrencyDto {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export interface ConvertCurrencyResponseDto {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
}
