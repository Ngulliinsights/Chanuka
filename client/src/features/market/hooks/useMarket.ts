/**
 * useMarket Hook
 * Integrates market data service with React component lifecycle
 */
import { useQuery } from '@tanstack/react-query';
import { marketService } from '../services/market';

export const useMarketData = (category: string) => {
  return useQuery({
    queryKey: ['market-data', category],
    queryFn: () => marketService.fetchMarketData(category),
    enabled: !!category,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useMarketInsights = () => {
  return useQuery({
    queryKey: ['market-insights'],
    queryFn: () => marketService.getMarketInsights(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useMarketTrends = (timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month') => {
  return useQuery({
    queryKey: ['market-trends', timeframe],
    queryFn: () => marketService.getMarketTrends(timeframe),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
