// frontend/lib/utils.ts

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

/**
 * Returns a color string based on the WBS code prefix.
 * This can be used to visually distinguish top-level WBS categories.
 * @param wbsCodePrefix The prefix of the WBS code (e.g., "1", "2", "1.1").
 * @returns A Tailwind CSS color class or a direct color value.
 */
export const getWBSColor = (wbsCodePrefix: string): string => {
  const firstDigit = wbsCodePrefix.split('.')[0];
  switch (firstDigit) {
    case '1': return '#60A5FA'; // Tailwind blue-400
    case '2': return '#34D399'; // Tailwind emerald-400
    case '3': return '#FACC15'; // Tailwind yellow-400
    case '4': return '#FB7185'; // Tailwind rose-400
    case '5': return '#A78BFA'; // Tailwind violet-400
    case '6': return '#2DD4BF'; // Tailwind teal-400
    case '7': return '#F472B6'; // Tailwind pink-400
    case '8': return '#F87171'; // Tailwind red-400
    case '9': return '#A3A3A3'; // Tailwind gray-400
    default: return '#94A3B8'; // Tailwind slate-400
  }
};