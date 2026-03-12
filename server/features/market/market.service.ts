import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { market_signals } from '@server/infrastructure/schema/market_intelligence';
import { desc, eq } from 'drizzle-orm';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { inputSanitizationService } from '@server/features/security';
import { createNotFoundError } from '@server/infrastructure/error-handling/error-factory';
import { calculateMarketMetrics } from './market.utils';

export const marketService = {
  /**
   * Ingest a new price signal
   */
  addPrice: async (productId: string, price: number, currency: string, location?: string) => {
    return safeAsync(async () => {
      // Validate and sanitize inputs
      const safeProductId = inputSanitizationService.sanitizeString(productId);
      const safeCurrency = inputSanitizationService.sanitizeString(currency);
      const safeLocation = typeof location === 'string' && location.trim() 
        ? inputSanitizationService.sanitizeString(location.trim())
        : 'nairobi';

      await writeDatabase.insert(market_signals).values({
        commodity_id: safeProductId,
        price_reported: price.toString(),
        location_county: safeLocation,
        trust_weight: '1.0',
        created_at: new Date()
      });

      logger.info({ 
        context: { service: 'MarketService', productId: safeProductId }
      }, 'Price signal recorded successfully');
    }, { service: 'MarketService', operation: 'addPrice' });
  },

  /**
   * Get realtime metrics for a specific commodity
   */
  getMarketMetrics: async (productId: string) => {
    return safeAsync(async () => {
      const safeProductId = inputSanitizationService.sanitizeString(productId);

      const signals = await readDatabase.query.market_signals.findMany({
        where: eq(market_signals.commodity_id, safeProductId),
        orderBy: [desc(market_signals.created_at)],
        limit: 100
      });

      if (signals.length === 0) {
        throw createNotFoundError('Insufficient data for this commodity', { productId: safeProductId });
      }

      const priceData = signals.map(s => ({
        productId: s.commodity_id,
        price: Number(s.price_reported),
        currency: 'KES',
        updatedAt: s.created_at
      }));

      return calculateMarketMetrics(priceData);
    }, { service: 'MarketService', operation: 'getMarketMetrics' });
  },

  /**
   * Get the absolute latest price signal
   */
  getLatestPrice: async (productId: string) => {
    return safeAsync(async () => {
      const safeProductId = inputSanitizationService.sanitizeString(productId);

      const result = await readDatabase.query.market_signals.findFirst({
        where: eq(market_signals.commodity_id, safeProductId),
        orderBy: [desc(market_signals.created_at)]
      });

      if (!result) {
         throw createNotFoundError('No signals found for this commodity', { productId: safeProductId });
      }
      return result;
    }, { service: 'MarketService', operation: 'getLatestPrice' });
  },

  /**
   * Get historical trend
   */
  getPriceHistory: async (productId: string, limit: number = 30) => {
    return safeAsync(async () => {
      const safeProductId = inputSanitizationService.sanitizeString(productId);
      
      return await readDatabase.query.market_signals.findMany({
        where: eq(market_signals.commodity_id, safeProductId),
        orderBy: [desc(market_signals.created_at)],
        limit: limit
      });
    }, { service: 'MarketService', operation: 'getPriceHistory' });
  }
};
