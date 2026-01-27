/**
 * Community Integration Hooks
 *
 * Connects the community API service with React Query and Zustand store
 * Provides unified hooks for all community features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { communityApiService } from '@client/core/api/community';
import { useToast } from '@client/lib/hooks/use-toast';

import {
  useActivityFeed as storeActivityFeed,
  useTrendingTopics as storeTrendingTopics,
  useExpertInsights as storeExpertInsights,
  useCommunityStats as storeCommunityStats,
} from '../store/slices/communitySlice';

/**
 * Hook for loading and managing activity feed
 */
export function useActivityFeed() {
  return storeActivityFeed();
}

/**
 * Hook for trending topics with real-time scoring
 */
export function useTrendingTopics() {
  return storeTrendingTopics();
}

/**
 * Hook for expert insights
 */
export function useExpertInsights() {
  return storeExpertInsights();
}

/**
 * Hook for community stats
 */
export function useCommunityStats() {
  return storeCommunityStats();
}

/**
 * Hook for local impact metrics
 */
export function useLocalImpact(location: { state?: string; district?: string }) {
  return useQuery({
    queryKey: ['community', 'local-impact', location],
    queryFn: async () => {
      const data = await communityApiService.getLocalImpactMetrics(location);
      return data;
    },
    enabled: !!(location.state || location.district),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for bill comments with pagination
 */
export function useBillComments(billId: number | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['community', 'comments', billId],
    queryFn: () =>
      communityApiService.getBillComments(billId!, {
        sort: 'newest',
        limit: 50,
      }),
    enabled: !!billId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createComment = useMutation({
    mutationFn: (content: string) =>
      communityApiService.addComment({
        billId: billId!,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', billId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'activity-feed'] });
    },
  });

  const voteComment = useMutation({
    mutationFn: ({ commentId, voteType }: { commentId: string; voteType: 'up' | 'down' }) =>
      communityApiService.voteComment(commentId, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', billId] });
    },
  });

  return {
    ...query,
    createComment,
    voteComment,
  };
}

/**
 * Hook for reporting content
 */
export function useReportContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      commentId: string;
      violationType: 'spam' | 'harassment' | 'misinformation' | 'offensive' | 'off_topic';
      reason: string;
    }) => communityApiService.reportComment(data),
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe.',
      });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Report failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Composite hook that loads all community data
 */
export function useCommunityData() {
  console.log('[useCommunityData-integration] Hook called, calling individual hooks');
  const activityFeed = useActivityFeed();
  const trendingTopics = useTrendingTopics();
  const expertInsights = useExpertInsights();
  const stats = useCommunityStats();

  console.log('[useCommunityData-integration] Individual hook results:', {
    activityFeed: {
      isLoading: activityFeed.isLoading,
      error: !!activityFeed.error,
      dataLength: activityFeed.data?.length,
    },
    trendingTopics: {
      isLoading: trendingTopics.isLoading,
      error: !!trendingTopics.error,
      dataLength: trendingTopics.data?.length,
    },
    expertInsights: {
      isLoading: expertInsights.isLoading,
      error: !!expertInsights.error,
      dataLength: expertInsights.data?.length,
    },
    stats: { isLoading: stats.isLoading, error: !!stats.error, data: !!stats.data },
  });

  const isLoading =
    activityFeed.isLoading ||
    trendingTopics.isLoading ||
    expertInsights.isLoading ||
    stats.isLoading;

  const error = activityFeed.error || trendingTopics.error || expertInsights.error || stats.error;

  const refetchAll = () => {
    activityFeed.refetch();
    trendingTopics.refetch();
    expertInsights.refetch();
    stats.refetch();
  };

  return {
    isLoading,
    error: error ? (error as Error).message : null,
    refetchAll,
    activityFeed: activityFeed.data || [],
    trendingTopics: trendingTopics.data || [],
    expertInsights: expertInsights.data || [],
    stats: stats.data,
  };
}
