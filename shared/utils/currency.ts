/**
 * Formats a number as a currency string.
 * @param value The number to format.
 * @param currency The currency code (e.g., 'USD', 'EUR'). Defaults to 'USD'.
 * @param locale The locale to use for formatting (e.g., 'en-US'). Defaults to 'en-US'.
 * @param omitCurrencySymbol If true, formats as a number with locale-specific grouping, but without the currency symbol.
 * @returns The formatted currency string or number string.
 */
export const formatCurrency = (value: number, currency: string = 'USD', locale: string = 'en-US', omitCurrencySymbol: boolean = false): string => {
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  if (!omitCurrencySymbol) {
    options.style = 'currency';
    options.currency = currency;
  }

  return new Intl.NumberFormat(locale, options).format(value);
};
