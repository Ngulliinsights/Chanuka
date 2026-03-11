/**
 * useRecommendations Hook
 * 
 * React hook for fetching and managing bill recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { recommendationApi } from '../api/recommendation-api';
import type { BillRecommendation } from '../types';

interface UseRecommendationsOptions {
  type?: 'personalized' | 'trending' | 'collaborative';
  billId?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseRecommendationsResult {
  recommendations: BillRecommendation[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useRecommendations(
  options: UseRecommendationsOptions = {}
): UseRecommendationsResult {
  const { type = 'personalized', billId, limit = 10, enabled = true } = options;

  const queryKey = billId
    ? ['recommendations', 'similar', billId, limit]
    : ['recommendations', type, limit];

  const queryFn = async () => {
    if (billId) {
      return recommendationApi.getSimilarBills(billId, limit);
    }

    switch (type) {
      case 'trending':
        return recommendationApi.getTrendingBills(limit);
      case 'collaborative':
        return recommendationApi.getCollaborativeRecommendations(limit);
      case 'personalized':
      default:
        return recommendationApi.getPersonalizedRecommendations(limit);
    }
  };

  const {
    data: recommendations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    recommendations,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

export function usePersonalizedRecommendations(limit = 10) {
  return useQuery({
    queryKey: ['recommendations', 'personalized', limit],
    queryFn: () => recommendationApi.getPersonalizedRecommendations(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTrendingBills(days = 7, limit = 10) {
  return useQuery({
    queryKey: ['recommendations', 'trending', days, limit],
    queryFn: () => recommendationApi.getTrendingBills(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSimilarBills(billId: number, limit = 10) {
  return useQuery({
    queryKey: ['recommendations', 'similar', billId, limit],
    queryFn: () => recommendationApi.getSimilarBills(String(billId), limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTrackEngagement() {
  return {
    mutate: (data: { bill_id: string; engagement_type: string }) => {
      // Track engagement - implement when analytics is ready
      console.log('Track engagement:', data);
    },
  };
}
