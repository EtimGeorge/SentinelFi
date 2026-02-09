import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi'; // Assumption: Helper for secure API calls
import axios from 'axios';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number;
}

interface CurrencyContextType {
  userCurrency: Currency;
  availableCurrencies: Currency[];
  currencies: Currency[]; // Alias for availableCurrencies
  setUserCurrencyCode: (code: string) => void;
  convertToDisplay: (usdAmount: number, includeSymbol?: boolean) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  convertToUSD: (localAmount: number) => number;
  isLoading: boolean;
}

const DEFAULT_CURRENCY: Currency = {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  rateToUSD: 1,
};

const CurrencyContext = createContext<CurrencyContextType>({
  userCurrency: DEFAULT_CURRENCY,
  availableCurrencies: [],
  currencies: [],
  setUserCurrencyCode: () => { },
  convertToDisplay: () => '',
  formatCurrency: () => '',
  convertToUSD: () => 0,
  isLoading: true,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userCurrencyCode, setUserCurrencyCodeState] = useState<string>('USD');
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const api = useSecuredApi();

  // Load saved currency preference from localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem('sentinel_currency_preference');
    if (savedCode) {
      setUserCurrencyCodeState(savedCode);
    }
  }, []);

  // Fetch supported currencies and rates
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        setIsLoading(true);
        // Using public endpoint if available, or secured one
        const response = await api.get('/currency/supported');
        if (response.data && response.data.currencies) {
          const currencies: Currency[] = response.data.currencies;
          setAvailableCurrencies(currencies);

          // Create a quick lookup map for rates (though currencies already have rateToUSD)
          const newRates: Record<string, number> = {};
          currencies.forEach(c => {
            newRates[c.code] = c.rateToUSD || 1;
          });
          setRates(newRates);
        }
      } catch (error) {
        console.error('Failed to fetch currencies from backend. Path: /currency/supported. Error:', error);
        // Fallback to basic USD
        setAvailableCurrencies([DEFAULT_CURRENCY]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  const setUserCurrencyCode = (code: string) => {
    setUserCurrencyCodeState(code);
    localStorage.setItem('sentinel_currency_preference', code);
    // TODO: Optionally persist to backend user profile here
  };

  const userCurrency = availableCurrencies.find(c => c.code === userCurrencyCode) || DEFAULT_CURRENCY;

  const convertToDisplay = (usdAmount: number, includeSymbol: boolean = true): string => {
    if (usdAmount === null || usdAmount === undefined) return '';
    const rate = userCurrency.rateToUSD || 1;
    const localAmount = usdAmount * rate;

    if (!includeSymbol) {
      // Return formatted number without symbol
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(localAmount);
    }

    return formatCurrency(localAmount, userCurrencyCode);
  };

  const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
    let symbol = '$';
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (currency) symbol = currency.symbol;

    // Use Intl.NumberFormat for proper formatting
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (e) {
      // Fallback
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
        convertToUSD,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
