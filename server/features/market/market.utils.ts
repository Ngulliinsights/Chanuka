import { PriceData, MarketMetrics } from './types'; // Assumed shared types

/**
 * PRODUCTION CONSTANTS - The "Soko Haki" Rules
 */
export const MARKET_CONSTANTS = {
  // 0-35% Variance: Legitimate profit, transport costs, and market volatility
  ACCEPTABLE_VARIANCE: 0.35,

  // 35-75% Variance: Suspicious, likely price gouging
  SUSPICIOUS_THRESHOLD: 0.75,

  // 75%+ Variance: Mathematical evidence of systemic extraction (Theft)
  CRITICAL_THRESHOLD: 0.75
};

/**
 * Calculates aggregated market metrics from raw signals
 */
export function calculateMarketMetrics(prices: PriceData[]): MarketMetrics {
  if (!prices || prices.length === 0) {
    return {
      totalVolume: 0,
      averagePrice: 0,
      priceFluctuation: 0,
      timestamp: new Date(),
    };
  }

  const priceValues = prices.map(p => Number(p.price));

  // Calculate Average
  const total = priceValues.reduce((a, b) => a + b, 0);
  const averagePrice = total / priceValues.length;

  // Calculate Fluctuation (Volatility)
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);

  // Avoid division by zero
  const priceFluctuation = minPrice > 0
    ? ((maxPrice - minPrice) / minPrice) * 100
    : 0;

  return {
    totalVolume: prices.length,
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    priceFluctuation: parseFloat(priceFluctuation.toFixed(2)),
    timestamp: new Date(),
  };
}

/**
 * Validates incoming market data integrity
 */
export function validateMarketData(data: Partial<PriceData>): boolean {
  return !!(
    data.productId &&
    data.price &&
    Number(data.price) > 0 &&
    data.currency &&
    data.currency.length === 3
  );
}