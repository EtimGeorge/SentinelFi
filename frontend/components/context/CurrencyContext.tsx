import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number;
  rate: number; // Alias for backward compatibility in reporting
}

interface CurrencyContextType {
  userCurrency: Currency;
  availableCurrencies: Currency[];
  currencies: Currency[]; // Alias for availableCurrencies
  setUserCurrencyCode: (code: string) => void;
  /**
   * Convert an amount from one currency to the user's selected display currency.
   * @param amount The raw amount in the source currency.
   * @param sourceCurrency The currency code the amount is stored in (e.g., 'NGN').
   * @param includeSymbol Whether to include the currency symbol (default: true).
   */
  convertToDisplay: (amount: number, sourceCurrencyOrIncludeSymbol?: string | boolean, includeSymbol?: boolean) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  /**
   * Convert an amount between any two currencies.
   */
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
  convertToUSD: (localAmount: number) => number;
  isLoading: boolean;
}

const DEFAULT_CURRENCY: Currency = {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  rateToUSD: 1,
  rate: 1,
};

const CurrencyContext = createContext<CurrencyContextType>({
  userCurrency: DEFAULT_CURRENCY,
  availableCurrencies: [DEFAULT_CURRENCY],
  currencies: [DEFAULT_CURRENCY],
  setUserCurrencyCode: () => { },
  convertToDisplay: () => '',
  formatCurrency: () => '',
  convertAmount: () => 0,
  convertToUSD: () => 0,
  isLoading: true,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userCurrencyCode, setUserCurrencyCodeState] = useState<string>('USD');
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([DEFAULT_CURRENCY]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const apiRef = useRef(api);
  const { isAuthenticated } = useAuth();

  // Load saved currency preference from localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem('sentinel_currency_preference');
    if (savedCode) {
      setUserCurrencyCodeState(savedCode);
    }
  }, []);

  // Fetch supported currencies and rates ONLY when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCurrencies = async () => {
      try {
        setIsLoading(true);
        const response = await apiRef.current.get('/currency/supported', { signal: controller.signal });
        if (response.data && response.data.currencies) {
          const currencies: Currency[] = response.data.currencies.map((c: any) => ({
            ...c,
            rate: c.rateToUSD || 1
          }));
          setAvailableCurrencies(currencies);

          // Create a quick lookup map for rates
          const newRates: Record<string, number> = {};
          currencies.forEach(c => {
            newRates[c.code] = c.rateToUSD || 1;
          });
          setRates(newRates);
        }
      } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch currencies from backend.', error);
        // If everything fails, we stay with the initial state (USD only)
        setAvailableCurrencies([DEFAULT_CURRENCY]);
        setRates({ USD: 1 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
    return () => controller.abort();
  }, [isAuthenticated]);

  const setUserCurrencyCode = (code: string) => {
    setUserCurrencyCodeState(code);
    localStorage.setItem('sentinel_currency_preference', code);
  };

  const userCurrency = availableCurrencies.find(c => c.code === userCurrencyCode) || DEFAULT_CURRENCY;

  /**
   * Convert between any two currencies using the rates map.
   * All rates are stored as "1 USD = X units", so:
   *   - To convert FROM a currency to USD: amount / rateToUSD
   *   - To convert FROM USD to a currency: amount * rateToUSD
   *   - Cross-currency: amount / fromRate * toRate
   */
  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Convert via USD: amount → USD → target
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
  };

  /**
   * Convert an amount from its source currency to the user's display currency and format it.
   * @param amount The raw amount in the source currency.
   * @param sourceCurrency The currency code the amount is stored in (defaults to user's currency = no conversion).
   * @param includeSymbol Whether to include the currency symbol.
   */
  const convertToDisplay = (amount: number, sourceCurrencyOrIncludeSymbol?: string | boolean, includeSymbol: boolean = true): string => {
    if (amount === null || amount === undefined) return '';

    // Backward compatibility: old callers pass (amount, boolean) for includeSymbol
    let sourceCurrency: string | undefined;
    let showSymbol = includeSymbol;

    if (typeof sourceCurrencyOrIncludeSymbol === 'boolean') {
      // Old signature: convertToDisplay(amount, includeSymbol)
      showSymbol = sourceCurrencyOrIncludeSymbol;
      sourceCurrency = undefined;
    } else {
      // New signature: convertToDisplay(amount, sourceCurrency, includeSymbol)
      sourceCurrency = sourceCurrencyOrIncludeSymbol;
    }

    const from = sourceCurrency || userCurrencyCode;
    const to = userCurrencyCode;

    const convertedAmount = convertAmount(amount, from, to);

    if (!showSymbol) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(convertedAmount);
    }

    return formatCurrency(convertedAmount, to);
  };

  const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (e) {
      const currency = availableCurrencies.find(c => c.code === currencyCode);
      const symbol = currency ? currency.symbol : '$';
      return `${symbol}${amount.toFixed(2)}`;
    }
  };

  const convertToUSD = (localAmount: number): number => {
    const rate = userCurrency.rateToUSD || 1;
    if (rate === 0) return 0;
    return localAmount / rate;
  };

  return (
    <CurrencyContext.Provider
      value={{
        userCurrency,
        availableCurrencies,
        currencies: availableCurrencies,
        setUserCurrencyCode,
        convertToDisplay,
        formatCurrency,
        convertAmount,
        convertToUSD,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
