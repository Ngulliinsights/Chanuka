/**
 * Market Service
 * Tracks civic and market data for recommendations
 */
import { globalApiClient } from '@client/infrastructure/api/client';

export interface MarketData {
  id: string;
  name: string;
  category: string;
  data: Record<string, unknown>;
  source: string;
  lastUpdated: string;
}

export interface MarketInsight {
  topic: string;
  trend: 'rising' | 'falling' | 'stable';
  impact: 'high' | 'medium' | 'low';
  relatedBills: string[];
}

export const marketService = {
  async fetchMarketData(category: string): Promise<MarketData[]> {
    const response = await globalApiClient.get('/api/market/data', { params: { category } });
    return response.data;
  },

  async getMarketInsights(): Promise<MarketInsight[]> {
    const response = await globalApiClient.get('/api/market/insights');
    return response.data;
  },

  async trackMarketEvent(event: { type: string; topic: string; metadata: Record<string, unknown> }): Promise<void> {
    await globalApiClient.post('/api/market/track', event);
  },

  async getMarketTrends(timeframe: 'week' | 'month' | 'quarter' | 'year'): Promise<MarketInsight[]> {
    const response = await globalApiClient.get('/api/market/trends', { params: { timeframe } });
    return response.data;
  },
};
