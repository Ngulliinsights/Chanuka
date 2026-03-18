/**
 * Community Hooks
 * React hooks for community features (comments, voting, reports) with real-time updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { communityApiService } from '../services/community-api.service';
import {
  Comment,
  Vote,
  Report,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateReportRequest,
  CommentQueryParams,
  VoteQueryParams,
  ReportQueryParams,
  VoteType,
} from '@shared/types/api/contracts/community.contracts';
import { useToast } from '@client/lib/hooks/use-toast';

// Query Keys
export const communityKeys = {
  all: ['community'] as const,
  comments: () => [...communityKeys.all, 'comments'] as const,
  commentsList: (params: Partial<CommentQueryParams>) =>
    [...communityKeys.comments(), 'list', params] as const,
  comment: (id: string) => [...communityKeys.comments(), 'detail', id] as const,
  commentTree: (billId: string, params?: any) =>
    [...communityKeys.comments(), 'tree', billId, params] as const,
  votes: () => [...communityKeys.all, 'votes'] as const,
  votesList: (params: Partial<VoteQueryParams>) =>
    [...communityKeys.votes(), 'list', params] as const,
  userVote: (targetId: string, targetType: string) =>
    [...communityKeys.votes(), 'user', targetType, targetId] as const,
  reports: () => [...communityKeys.all, 'reports'] as const,
  reportsList: (params: Partial<ReportQueryParams>) =>
    [...communityKeys.reports(), 'list', params] as const,
  stats: () => [...communityKeys.all, 'stats'] as const,
  trends: (params: any) => [...communityKeys.all, 'trends', params] as const,
  contributors: (params: any) => [...communityKeys.all, 'contributors', params] as const,
};

// Comment Hooks
export function useComments(params?: Partial<CommentQueryParams>) {
  return useQuery({
    queryKey: communityKeys.commentsList(params || {}),
    queryFn: () => communityApiService.getComments(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useComment(id: string) {
  return useQuery({
    queryKey: communityKeys.comment(id),
    queryFn: () => communityApiService.getComment(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCommentTree(
  billId: string,
  params?: {
    maxDepth?: number;
    sortBy?: 'newest' | 'oldest' | 'popular';
    limit?: number;
  }
) {
  return useQuery({
    queryKey: communityKeys.commentTree(billId, params),
    queryFn: () => communityApiService.getCommentTree(billId, params),
    enabled: !!billId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCommentReplies(commentId: string, params?: Partial<CommentQueryParams>) {
  return useQuery({
    queryKey: [...communityKeys.comment(commentId), 'replies', params],
    queryFn: () => communityApiService.getCommentReplies(commentId, params),
    enabled: !!commentId,
    staleTime: 2 * 60 * 1000,
  });
}

// Comment Mutations
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) => communityApiService.createComment(data),
    onSuccess: (response, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });
      queryClient.invalidateQueries({ queryKey: communityKeys.commentTree(variables.billId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });

      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: [...communityKeys.comment(variables.parentId), 'replies'],
        });
      }

      toast({
        title: 'Comment Posted',
        description: 'Your comment has been posted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Post Comment',
        description: error.message || 'Unable to post comment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommentRequest }) =>
      communityApiService.updateComment(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comment(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });

      toast({
        title: 'Comment Updated',
        description: 'Your comment has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Comment',
        description: error.message || 'Unable to update comment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => communityApiService.deleteComment(id),
    onSuccess: (response, id) => {
      queryClient.removeQueries({ queryKey: communityKeys.comment(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });

      toast({
        title: 'Comment Deleted',
        description: 'Your comment has been deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Comment',
        description: error.message || 'Unable to delete comment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Vote Hooks
export function useUserVote(targetId: string, targetType: 'comment' | 'bill' | 'amendment') {
  return useQuery({
    queryKey: communityKeys.userVote(targetId, targetType),
    queryFn: () => communityApiService.getUserVote(targetId, targetType),
    enabled: !!(targetId && targetType),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useVoteOnComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ commentId, type }: { commentId: string; type: VoteType }) =>
      communityApiService.voteOnComment(commentId, type),
    onSuccess: (response, { commentId, type }) => {
      // Update user vote cache
      queryClient.setQueryData(communityKeys.userVote(commentId, 'comment'), response);

      // Invalidate comment to refresh vote counts
      queryClient.invalidateQueries({ queryKey: communityKeys.comment(commentId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });

      toast({
        title: type === 'upvote' ? 'Upvoted' : 'Downvoted',
        description: `You ${type === 'upvote' ? 'upvoted' : 'downvoted'} this comment`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Vote Failed',
        description: error.message || 'Unable to record your vote. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useVoteOnBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ billId, type }: { billId: string; type: VoteType }) =>
      communityApiService.voteOnBill(billId, type),
    onSuccess: (response, { billId, type }) => {
      queryClient.setQueryData(communityKeys.userVote(billId, 'bill'), response);

      toast({
        title: type === 'upvote' ? 'Supported' : 'Opposed',
        description: `You ${type === 'upvote' ? 'support' : 'oppose'} this bill`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Vote Failed',
        description: error.message || 'Unable to record your vote. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Report Hooks
export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateReportRequest) => communityApiService.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.reports() });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting. We will review this content.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Report Failed',
        description: error.message || 'Unable to submit report. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Statistics and Analytics Hooks
export function useCommunityStats(params?: {
  dateFrom?: string;
  dateTo?: string;
  billId?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: [...communityKeys.stats(), params],
    queryFn: () => communityApiService.getCommunityStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEngagementTrends(params: {
  period: 'day' | 'week' | 'month';
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: communityKeys.trends(params),
    queryFn: () => communityApiService.getEngagementTrends(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useTopContributors(params?: {
  period?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
}) {
  return useQuery({
    queryKey: communityKeys.contributors(params || {}),
    queryFn: () => communityApiService.getTopContributors(params),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Search Hook
export function useCommentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchParams, setSearchParams] = useState<{
    billId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }>({});

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResult = useQuery({
    queryKey: [...communityKeys.comments(), 'search', debouncedQuery, searchParams],
    queryFn: () => communityApiService.searchComments(debouncedQuery, searchParams),
    enabled: debouncedQuery.length > 2,
    staleTime: 2 * 60 * 1000,
  });

  return {
    searchQuery,
    setSearchQuery,
    searchParams,
    setSearchParams,
    updateSearchParams: useCallback((updates: Partial<typeof searchParams>) => {
      setSearchParams(prev => ({ ...prev, ...updates }));
    }, []),
    clearSearch: useCallback(() => {
      setSearchQuery('');
      setSearchParams({});
    }, []),
    ...searchResult,
  };
}

// Real-time Hooks
export function useRealTimeComments(billId: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!billId) return;

    const unsubscribe = communityApiService.subscribeToComments(billId, comment => {
      // Add new comment to cache
      queryClient.setQueryData(communityKeys.commentTree(billId), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            // Add new comment to the tree
            // This would need more sophisticated logic for proper tree insertion
          },
        };
      });

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    });

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [billId, queryClient]);

  return { isConnected };
}

export function useRealTimeVotes(targetId: string, targetType: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!targetId || !targetType) return;

    const unsubscribe = communityApiService.subscribeToVotes(targetId, targetType, vote => {
      // Update vote counts in cache
      if (targetType === 'comment') {
        queryClient.invalidateQueries({ queryKey: communityKeys.comment(targetId) });
      }
      queryClient.invalidateQueries({ queryKey: communityKeys.userVote(targetId, targetType) });
    });

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [targetId, targetType, queryClient]);

  return { isConnected };
}

// Moderation Hooks (for admin users)
export function useHighlightComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, highlight }: { id: string; highlight: boolean }) =>
      communityApiService.highlightComment(id, highlight),
    onSuccess: (response, { id, highlight }) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comment(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });

      toast({
        title: highlight ? 'Comment Highlighted' : 'Highlight Removed',
        description: highlight
          ? 'Comment has been highlighted'
          : 'Comment highlight has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Moderation Failed',
        description: error.message || 'Unable to update comment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function usePinComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      communityApiService.pinComment(id, pin),
    onSuccess: (response, { id, pin }) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comment(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.comments() });

      toast({
        title: pin ? 'Comment Pinned' : 'Comment Unpinned',
        description: pin ? 'Comment has been pinned' : 'Comment has been unpinned',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Moderation Failed',
        description: error.message || 'Unable to update comment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
