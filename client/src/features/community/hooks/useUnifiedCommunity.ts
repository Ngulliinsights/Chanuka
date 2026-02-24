/**
 * Unified Community Hook
 *
 * Consolidates community functionality with discussion features,
 * providing a comprehensive community management interface.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { globalApiClient } from '../../../infrastructure/api/client';
import type { UseUnifiedCommunityReturn, UnifiedComment } from '../../../infrastructure/community/types';

import { useUnifiedDiscussion } from './useUnifiedDiscussion';

interface UseUnifiedCommunityOptions {
  billId: number;
  autoSubscribe?: boolean;
  enableTypingIndicators?: boolean;
  enableRealtime?: boolean;
}

export function useUnifiedCommunity({
  billId,
  autoSubscribe = true,
  enableTypingIndicators = true,
  enableRealtime = true,
}: UseUnifiedCommunityOptions): UseUnifiedCommunityReturn {
  // Get all discussion functionality
  const discussion = useUnifiedDiscussion({
    billId,
    autoSubscribe,
    enableTypingIndicators,
    enableRealtime,
  });

  // Community stats
  const { data: stats } = useQuery({
    queryKey: ['community-stats', billId],
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/community-stats`);
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });

  // Expert insights
  const { data: expertInsights = [] } = useQuery({
    queryKey: ['expert-insights', billId],
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/expert-insights`);
      return response.data as UnifiedComment[];
    },
    staleTime: 600000, // 10 minutes
  });

  // Trending topics
  const { data: trendingTopics = [] } = useQuery({
    queryKey: ['trending-topics', billId],
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/trending-topics`);
      return response.data as string[];
    },
    staleTime: 900000, // 15 minutes
  });

  // Social features
  const shareThread = async (threadId: string, platform: string) => {
    try {
      await globalApiClient.post(`/api/threads/${threadId}/share`, { platform });
    } catch (error) {
      console.error('Failed to share thread:', error);
      throw new Error('Failed to share thread');
    }
  };

  const bookmarkComment = async (commentId: string) => {
    try {
      await globalApiClient.post(`/api/comments/${commentId}/bookmark`);
    } catch (error) {
      console.error('Failed to bookmark comment:', error);
      throw new Error('Failed to bookmark comment');
    }
  };

  const followThread = async (threadId: string) => {
    try {
      await globalApiClient.post(`/api/threads/${threadId}/follow`);
    } catch (error) {
      console.error('Failed to follow thread:', error);
      throw new Error('Failed to follow thread');
    }
  };

  // Computed stats with defaults
  const communityStats = useMemo(() => {
    const statsData = stats as
      | {
          totalComments?: number;
          totalThreads?: number;
          activeUsers?: number;
          expertComments?: number;
        }
      | undefined;
    return {
      totalComments: statsData?.totalComments || discussion.comments.length,
      totalThreads: statsData?.totalThreads || discussion.threads.length,
      activeUsers: statsData?.activeUsers || discussion.activeUsers.length,
      expertComments:
        statsData?.expertComments || discussion.comments.filter(c => c.isAuthorExpert).length,
    };
  }, [stats, discussion.comments, discussion.threads, discussion.activeUsers]);

  return {
    discussion,
    stats: communityStats,
    shareThread,
    bookmarkComment,
    followThread,
    expertInsights,
    trendingTopics,
  };
}
