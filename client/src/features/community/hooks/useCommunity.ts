import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApiService } from '@client/core/api/community';
import { useToast } from '@/hooks/use-toast';
import type {
  Comment,
  DiscussionThread,
  CreateCommentRequest,
  CreateThreadRequest,
  UpdateCommentRequest,
  VoteRequest,
  ShareRequest,
  SocialShare
} from '../types';
import type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityStats,
  LocalImpactMetrics,
  CommunityFilters
} from '@client/types/community';

/**
 * Hook for comments management
 */
export function useComments(bill_id?: string, filters?: CommunityFilters) { const queryClient = useQueryClient();

  const comments = useQuery({
    queryKey: ['community', 'comments', bill_id, filters],
    queryFn: () => bill_id ? communityApiService.getBillComments(parseInt(bill_id), filters) : Promise.resolve([]),
    staleTime: 2 * 60 * 1000, // 2 minutes
   });

  const createComment = useMutation<Comment, Error, CreateCommentRequest>({
    mutationFn: async (request: CreateCommentRequest) => {
      // Adapt the request to match API service expectations
      const apiRequest = {
        billId: request.bill_id || 0,
        content: request.content,
        parentId: request.parent_id,
        mentions: request.mentions,
        attachments: request.attachments
      };
      return await communityApiService.addComment(apiRequest);
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', (newComment as any).billId || (newComment as any).bill_id]
      });
      queryClient.setQueryData(
        ['community', 'comments', (newComment as any).billId || (newComment as any).bill_id],
        (old: any) => ({
          ...old,
          comments: [newComment, ...(old?.comments || [])]
        })
      );
    },
    onError: (error: Error) => {
      console.error('Failed to create comment:', error);
    },
  });

  const updateComment = useMutation<Comment, Error, { comment_id: string; request: UpdateCommentRequest }>({
    mutationFn: ({ comment_id, request }: { comment_id: string; request: UpdateCommentRequest }) =>
      communityApiService.updateComment(comment_id, request.content),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', (updatedComment as any).billId || (updatedComment as any).bill_id]
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update comment:', error);
    },
  });

  const deleteComment = useMutation({
    mutationFn: (comment_id: string) => communityApiService.deleteComment(comment_id),
    onSuccess: (_, comment_id) => {
      // Remove from cache
      queryClient.setQueryData(
        ['community', 'comments'],
        (old: any) => ({
          ...old,
          comments: old?.comments?.filter((c: Comment) => c.id !== comment_id) || []
        })
      );
    },
    onError: (error: Error) => {
      console.error('Failed to delete comment:', error);
    },
  });

  const voteOnComment = useMutation<Comment, Error, VoteRequest>({
    mutationFn: async (request: VoteRequest) => {
      const result = await communityApiService.voteComment(request.comment_id, request.vote_type === 'up' ? 'up' : 'down');
      return result || {} as Comment; // API returns VoteResponse | null, but we need Comment
    },
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', (updatedComment as any).billId || (updatedComment as any).bill_id]
      });
    },
    onError: (error: Error) => {
      console.error('Failed to vote on comment:', error);
    },
  });

  return {
    comments,
    createComment,
    updateComment,
    deleteComment,
    voteOnComment,
  };
}

/**
 * Hook for discussion threads
 */
export function useThreads(filters?: any) {
  const queryClient = useQueryClient();

  const threads = useQuery({
    queryKey: ['community', 'threads', filters],
    queryFn: () => {
      // Note: communityApiService doesn't have threads method
      // This would need to be added or we use existing discussion methods
      return Promise.resolve([]);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createThread = useMutation({
    mutationFn: (request: CreateThreadRequest) => {
      // Note: communityApiService doesn't have thread creation method
      // This would need to be added
      console.log('Create thread:', request);
      return Promise.resolve({} as DiscussionThread);
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'threads'] });
      queryClient.setQueryData(
        ['community', 'threads'],
        (old: any) => ({
          ...old,
          threads: [newThread, ...(old?.threads || [])]
        })
      );
    },
    onError: (error: Error) => {
      console.error('Failed to create thread:', error);
    },
  });

  const updateThread = useMutation({
    mutationFn: ({ threadId, updates }: { threadId: string; updates: Partial<CreateThreadRequest> }) => {
      // Note: communityApiService doesn't have thread update method
      console.log('Update thread:', threadId, updates);
      return Promise.resolve({} as DiscussionThread);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'threads'] });
    },
    onError: (error: Error) => {
      console.error('Failed to update thread:', error);
    },
  });

  const deleteThread = useMutation({
    mutationFn: (threadId: string) => {
      // Note: communityApiService doesn't have thread delete method
      console.log('Delete thread:', threadId);
      return Promise.resolve();
    },
    onSuccess: (_, threadId) => {
      queryClient.setQueryData(
        ['community', 'threads'],
        (old: any) => ({
          ...old,
          threads: old?.threads?.filter((t: DiscussionThread) => t.id !== threadId) || []
        })
      );
    },
    onError: (error: Error) => {
      console.error('Failed to delete thread:', error);
    },
  });

  return {
    threads,
    createThread,
    updateThread,
    deleteThread,
  };
}

/**
 * Hook for individual thread details
 */
export function useThread(threadId: string | undefined) {
  return useQuery({
    queryKey: ['community', 'thread', threadId],
    queryFn: () => {
      // Note: communityApiService doesn't have getThread method
      // This would need to be added
      return Promise.resolve(null);
    },
    enabled: !!threadId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for social sharing
 */
export function useSocialSharing() {
  const { toast } = useToast();

  const shareContent = useMutation<SocialShare, Error, ShareRequest>({
    mutationFn: (request: ShareRequest) => {
      // Note: communityApiService doesn't have sharing methods
      // This would need to be added
      console.log('Share content:', request);
      return Promise.resolve({} as SocialShare);
    },
    onSuccess: (share) => {
      toast({
        title: "Content shared!",
        description: `Shared to ${share.platform}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Share failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const trackClick = useMutation({
    mutationFn: (shareId: string) => {
      // Note: communityApiService doesn't have tracking methods
      console.log('Track share click:', shareId);
      return Promise.resolve();
    },
    // Silent operation, no user feedback needed
  });

  return {
    shareContent,
    trackClick,
  };
}

/**
 * Hook for community statistics
 */
export function useCommunityStats() {
  const stats = useQuery({
    queryKey: ['community', 'stats'],
    queryFn: () => communityApiService.getCommunityStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const topContributors = useQuery({
    queryKey: ['community', 'contributors'],
    queryFn: () => {
      // Note: communityApiService doesn't have getTopContributors method
      return Promise.resolve([]);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const recentActivity = useQuery({
    queryKey: ['community', 'activity'],
    queryFn: () => {
      // Note: communityApiService doesn't have getRecentActivity method
      return Promise.resolve([]);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    stats,
    topContributors,
    recentActivity,
  };
}

/**
 * Hook for thread participation
 */
export function useThreadParticipation(threadId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const participants = useQuery({
    queryKey: ['community', 'thread', threadId, 'participants'],
    queryFn: () => {
      // Note: communityApiService doesn't have thread participation methods
      return Promise.resolve([]);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const joinThread = useMutation({
    mutationFn: () => {
      // Note: communityApiService doesn't have thread participation methods
      console.log('Join thread:', threadId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'thread', threadId, 'participants']
      });
      toast({
        title: "Joined discussion",
        description: "You are now participating in this thread.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leaveThread = useMutation({
    mutationFn: () => {
      // Note: communityApiService doesn't have thread participation methods
      console.log('Leave thread:', threadId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'thread', threadId, 'participants']
      });
      toast({
        title: "Left discussion",
        description: "You are no longer participating in this thread.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to leave",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    participants,
    joinThread,
    leaveThread,
  };
}

/**
 * Hook for community search
 */
export function useCommunitySearch(query: string, filters?: CommunityFilters) {
  return useQuery({
    queryKey: ['community', 'search', query, filters],
    queryFn: () => {
      // Note: communityApiService doesn't have search method
      console.log('Search community:', query, filters);
      return Promise.resolve([]);
    },
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for popular tags
 */
export function usePopularTags(limit = 20) {
  return useQuery({
    queryKey: ['community', 'tags', limit],
    queryFn: () => {
      // Note: communityApiService doesn't have tags method
      return Promise.resolve([]);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for activity feed
 */
export function useActivityFeed(filters?: CommunityFilters, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['community', 'activity', filters, page, limit],
    queryFn: () => {
      // Adapt filters to API expectations
      const apiFilters = {
        limit,
        offset: (page - 1) * limit,
        contentTypes: filters?.contentTypes?.map(type => {
          // Map content types to API expected values
          switch (type) {
            case 'comments': return 'comment' as const;
            case 'expert_insights': return 'expert_insight' as const;
            default: return 'comment' as const; // fallback
          }
        }),
        timeRange: filters?.timeRange,
        geography: filters?.geography ? {
          state: filters.geography.states?.[0], // Take first state
          district: filters.geography.districts?.[0], // Take first district
          county: filters.geography.counties?.[0] // Take first county
        } : undefined,
        followedOnly: false
      };
      return communityApiService.getActivityFeed(apiFilters);
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Hook for trending topics
 */
export function useTrendingTopics(limit: number = 10) {
  return useQuery({
    queryKey: ['community', 'trending', limit],
    queryFn: () => communityApiService.getTrendingTopics(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for expert insights
 */
export function useExpertInsights(billId?: number, filters?: CommunityFilters) {
  return useQuery({
    queryKey: ['community', 'insights', billId, filters],
    queryFn: () => {
      if (billId) {
        return communityApiService.getExpertInsights(billId);
      }
      // If no billId, return empty array for now
      return Promise.resolve([]);
    },
    enabled: !!billId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for campaigns
 */
export function useCampaigns() {
  return useQuery({
    queryKey: ['community', 'campaigns'],
    queryFn: () => {
      // Note: communityApiService doesn't have campaigns method
      // This would need to be added to the API service
      return Promise.resolve([]);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for petitions
 */
export function usePetitions() {
  return useQuery({
    queryKey: ['community', 'petitions'],
    queryFn: () => {
      // Note: communityApiService doesn't have petitions method
      // This would need to be added to the API service
      return Promise.resolve([]);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for local impact metrics
 */
export function useLocalImpact(location?: { state?: string; district?: string; county?: string }) {
  return useQuery({
    queryKey: ['community', 'local-impact', location],
    queryFn: () => communityApiService.getLocalImpactMetrics(location || {}),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for real-time community updates (would integrate with WebSocket)
 */
export function useRealtimeCommunity(_threadId?: string) {
  // This would integrate with WebSocket for real-time updates
  // For now, return a placeholder structure

  return {
    isConnected: false,
    connectionStatus: 'disconnected' as const,
    subscribeToThread: (_id: string) => {},
    subscribeToComments: (_bill_id?: string) => {},
    unsubscribe: () => {},
  };
}





































