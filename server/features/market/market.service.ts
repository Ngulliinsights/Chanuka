import { db } from '@server/infrastructure/database';
import { market_commodities,market_signals } from '@server/infrastructure/schema/market_intelligence';
import { and, desc, eq, gte,sql } from 'drizzle-orm';
import { injectable } from 'inversify';

import { calculateMarketMetrics, validateMarketData } from './market.utils';

@injectable()
export class MarketService {

  /**
   * Ingest a new price signal (The Sensor)
   */
  async addPrice(productId: string, price: number, currency: string, location?: string): Promise<void> {
    if (!validateMarketData({ productId, price, currency })) {
      throw new Error("Invalid market data payload");
    }

    // Validate and sanitize location
    const sanitizedLocation = typeof location === 'string' && location.trim() 
      ? location.trim() 
      : 'nairobi';

    await db.insert(market_signals).values({
      commodity_id: productId, // Mapped to commodity_id
      price_reported: price.toString(),
      location_county: sanitizedLocation, // Default or sanitized
      trust_weight: '1.0', // Default for anonymous
      created_at: new Date()
    });
  }

  /**
   * Get realtime metrics for a specific commodity
   */
  async getMarketMetrics(productId: string) {
    // Fetch last 100 signals for this product to calculate live metrics
    const signals = await db.query.market_signals.findMany({
      where: eq(market_signals.commodity_id, productId),
      orderBy: [desc(market_signals.created_at)],
      limit: 100
    });

    if (signals.length === 0) return null;

    // Map DB result to PriceData interface expected by utils
    const priceData = signals.map(s => ({
      productId: s.commodity_id,
      price: Number(s.price_reported),
      currency: 'KES', // Defaulting for MVP
      updatedAt: s.created_at
    }));

    return calculateMarketMetrics(priceData);
  }

  /**
   * Get the absolute latest price signal
   */
  async getLatestPrice(productId: string) {
    return await db.query.market_signals.findFirst({
      where: eq(market_signals.commodity_id, productId),
      orderBy: [desc(market_signals.created_at)]
    });
  }

  /**
   * Get historical trend (Optimized with SQL aggregation)
   */
  async getPriceHistory(productId: string, limit: number = 30) {
    return await db.query.market_signals.findMany({
      where: eq(market_signals.commodity_id, productId),
      orderBy: [desc(market_signals.created_at)],
      limit: limit
    });
  }
}
