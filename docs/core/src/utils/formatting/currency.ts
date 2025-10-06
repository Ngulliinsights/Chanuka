/**
 * Currency Formatting Utilities
 */

export type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyFormatOptions {
  code?: CurrencyCode;
  decimals?: number;
  includeSymbol?: boolean;
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  KES: 'KSh',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    code = 'KES',
    decimals = 2,
    includeSymbol = true
  } = options;

  const formatted = amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (!includeSymbol) return formatted;
  
  return `${CURRENCY_SYMBOLS[code]} ${formatted}`;
}

export function formatRange(
  min: number,
  max: number,
  options: CurrencyFormatOptions = {}
): string {
  return `${formatCurrency(min, options)} - ${formatCurrency(max, options)}`;
}

export function formatPricePerUnit(
  price: number,
  unit: string,
  options: CurrencyFormatOptions = {}
): string {
  return `${formatCurrency(price, options)}/${unit}`;
}
