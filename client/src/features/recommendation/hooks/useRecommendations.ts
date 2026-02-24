/**
 * Recommendation Engine Hooks
 * 
 * React hooks for interacting with the recommendation engine API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationApi } from '../api/recommendation-api';
import type { EngagementTrackingRequest } from '../types';
import { logger } from '@client/lib/utils/logger';

/**
 * Hook to get personalized recommendations
 */
export function usePersonalizedRecommendations(limit: number = 10) {
  return useQuery({
    queryKey: ['recommendations', 'personalized', limit],
    queryFn: () => recommendationApi.getPersonalized(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get similar bills
 */
export function useSimilarBills(billId: number | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['recommendations', 'similar', billId, limit],
    queryFn: () => recommendationApi.getSimilarBills(billId!, limit),
    enabled: !!billId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to get trending bills
 */
export function useTrendingBills(days: number = 7, limit: number = 10) {
  return useQuery({
    queryKey: ['recommendations', 'trending', days, limit],
    queryFn: () => recommendationApi.getTrending(days, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get collaborative recommendations
 */
export function useCollaborativeRecommendations(limit: number = 10) {
  return useQuery({
    queryKey: ['recommendations', 'collaborative', limit],
    queryFn: () => recommendationApi.getCollaborative(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to track engagement
 */
export function useTrackEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EngagementTrackingRequest) => 
      recommendationApi.trackEngagement(request),
    onSuccess: (_, variables) => {
      logger.info('Engagement tracked', { 
        billId: variables.bill_id, 
        type: variables.engagement_type 
      });
      
      // Invalidate recommendations to get updated results
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error) => {
      logger.error('Failed to track engagement', { component: 'useRecommendations' }, error);
    },
  });
}
