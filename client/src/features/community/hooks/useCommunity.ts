import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '../services/community-api';
import { useToast } from '@/hooks/use-toast';
import type {
  Comment,
  DiscussionThread,
  CommunityFilters,
  CreateCommentRequest,
  CreateThreadRequest,
  UpdateCommentRequest,
  VoteRequest,
  ShareRequest
} from '../types';

/**
 * Hook for comments management
 */
export function useComments(bill_id?: string, filters?: CommunityFilters) { const queryClient = useQueryClient();

  const comments = useQuery({
    queryKey: ['community', 'comments', bill_id, filters],
    queryFn: () => communityApi.getComments(bill_id, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
   });

  const createComment = useMutation({
    mutationFn: (request: CreateCommentRequest) => communityApi.createComment(request),
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', newComment.bill_id]
      });
      queryClient.setQueryData(
        ['community', 'comments', newComment.bill_id],
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

  const updateComment = useMutation({
    mutationFn: ({ comment_id, request }: { comment_id: string; request: UpdateCommentRequest }) =>
      communityApi.updateComment(comment_id, request),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', updatedComment.bill_id]
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update comment:', error);
    },
  });

  const deleteComment = useMutation({
    mutationFn: (comment_id: string) => communityApi.deleteComment(comment_id),
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

  const voteOnComment = useMutation({
    mutationFn: (request: VoteRequest) => communityApi.voteOnComment(request),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'comments', updatedComment.bill_id]
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
export function useThreads(filters?: CommunityFilters) {
  const queryClient = useQueryClient();

  const threads = useQuery({
    queryKey: ['community', 'threads', filters],
    queryFn: () => communityApi.getThreads(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createThread = useMutation({
    mutationFn: (request: CreateThreadRequest) => communityApi.createThread(request),
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
    mutationFn: ({ threadId, updates }: { threadId: string; updates: Partial<CreateThreadRequest> }) =>
      communityApi.updateThread(threadId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'threads'] });
    },
    onError: (error: Error) => {
      console.error('Failed to update thread:', error);
    },
  });

  const deleteThread = useMutation({
    mutationFn: (threadId: string) => communityApi.deleteThread(threadId),
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
    queryFn: () => communityApi.getThread(threadId!),
    enabled: !!threadId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for social sharing
 */
export function useSocialSharing() {
  const { toast } = useToast();

  const shareContent = useMutation({
    mutationFn: (request: ShareRequest) => communityApi.shareContent(request),
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
    mutationFn: (shareId: string) => communityApi.trackShareClick(shareId),
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
    queryFn: () => communityApi.getCommunityStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const topContributors = useQuery({
    queryKey: ['community', 'contributors'],
    queryFn: () => communityApi.getTopContributors(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const recentActivity = useQuery({
    queryKey: ['community', 'activity'],
    queryFn: () => communityApi.getRecentActivity(),
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
    queryFn: () => communityApi.getThreadParticipants(threadId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const joinThread = useMutation({
    mutationFn: () => communityApi.joinThread(threadId),
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
    mutationFn: () => communityApi.leaveThread(threadId),
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
    queryFn: () => communityApi.searchCommunity(query, filters),
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
    queryFn: () => communityApi.getPopularTags(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for real-time community updates (would integrate with WebSocket)
 */
export function useRealtimeCommunity(threadId?: string) {
  // This would integrate with WebSocket for real-time updates
  // For now, return a placeholder structure

  return {
    isConnected: false,
    connectionStatus: 'disconnected' as const,
    subscribeToThread: (id: string) => {},
    subscribeToComments: (bill_id?: string) => {},
    unsubscribe: () => {},
  };
}





































