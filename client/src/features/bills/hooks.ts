/**
 * Bills Feature Hooks
 * Consolidated React Query hooks for bills functionality with optimized
 * caching, error handling, and type safety
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  BillsSearchParams,
  CommentPayload,
  EngagementPayload,
  CreatePollPayload,
} from '@client/infrastructure/api/bills';
import { billsApiService } from '@client/infrastructure/api/bills';
import { useToast } from '@client/lib/hooks/use-toast';

import { BillsQueryParams } from './types';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const billsKeys = {
  all: ['bills'] as const,
  lists: () => [...billsKeys.all, 'list'] as const,
  list: (params: BillsSearchParams) => [...billsKeys.lists(), params] as const,
  details: () => [...billsKeys.all, 'detail'] as const,
  detail: (id: string) => [...billsKeys.details(), id] as const,
  comments: (billId: string) => [...billsKeys.detail(billId), 'comments'] as const,
  sponsors: (billId: string) => [...billsKeys.detail(billId), 'sponsors'] as const,
  polls: (billId: string) => [...billsKeys.detail(billId), 'polls'] as const,
  analysis: (billId: string) => [...billsKeys.detail(billId), 'analysis'] as const,
  sponsorshipAnalysis: (billId: string) =>
    [...billsKeys.detail(billId), 'sponsorship-analysis'] as const,
  primarySponsorAnalysis: (billId: string) =>
    [...billsKeys.detail(billId), 'primary-sponsor-analysis'] as const,
  coSponsorsAnalysis: (billId: string) =>
    [...billsKeys.detail(billId), 'co-sponsors-analysis'] as const,
  financialAnalysis: (billId: string) =>
    [...billsKeys.detail(billId), 'financial-analysis'] as const,
  metadata: () => [...billsKeys.all, 'metadata'] as const,
  categories: () => [...billsKeys.metadata(), 'categories'] as const,
  statuses: () => [...billsKeys.metadata(), 'statuses'] as const,
};

// ============================================================================
// Query Hooks - Core Bill Operations
// ============================================================================

/**
 * Fetches a filtered and paginated list of bills
 * @param params - Search, filter, and pagination parameters
 * @returns Query result with paginated bills data
 */
export function useBills(params: BillsQueryParams = {}) {
  return useQuery({
    queryKey: billsKeys.list(params as BillsSearchParams), 
    queryFn: () => billsApiService.getBills(params as BillsSearchParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetches a single bill's complete details by ID
 * @param id - Bill ID
 * @returns Query result with full bill data
 */
export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: billsKeys.detail(id!),
    queryFn: () => billsApiService.getBillById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// ============================================================================
// Query Hooks - Comments & Community
// ============================================================================

/**
 * Fetches all comments for a specific bill
 * @param billId - Bill ID
 * @returns Query result with comments array
 */
export function useBillComments(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.comments(billId!),
    queryFn: () => billsApiService.getBillComments(billId!),
    enabled: !!billId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Query Hooks - Polls
// ============================================================================

/**
 * Fetches all polls for a specific bill
 * @param billId - Bill ID
 * @returns Query result with polls array
 */
export function useBillPolls(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.polls(billId!),
    queryFn: () => billsApiService.getBillPolls(billId!),
    enabled: !!billId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// Query Hooks - Sponsors & Analysis
// ============================================================================

/**
 * Fetches the list of sponsors and co-sponsors for a bill
 * @param billId - Bill ID
 * @returns Query result with sponsors array
 */
export function useBillSponsors(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.sponsors(billId!),
    queryFn: () => billsApiService.getBillSponsors(billId!),
    enabled: !!billId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetches AI-generated analysis of a bill's content and impact
 * @param billId - Bill ID
 * @returns Query result with comprehensive bill analysis
 */
export function useBillAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.analysis(billId!),
    queryFn: () => billsApiService.getBillAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}

/**
 * Fetches sponsorship analysis including financial connections
 * @param billId - Bill ID
 * @returns Query result with sponsorship analysis
 */
export function useBillSponsorshipAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.sponsorshipAnalysis(billId!),
    queryFn: () => billsApiService.getBillSponsorshipAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Fetches analysis of the bill's primary sponsor
 * @param billId - Bill ID
 * @returns Query result with primary sponsor analysis
 */
export function useBillPrimarySponsorAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.primarySponsorAnalysis(billId!),
    queryFn: () => billsApiService.getBillPrimarySponsorAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Fetches co-sponsor network analysis
 * @param billId - Bill ID
 * @returns Query result with co-sponsors analysis
 */
export function useBillCoSponsorsAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.coSponsorsAnalysis(billId!),
    queryFn: () => billsApiService.getBillCoSponsorsAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Fetches financial network analysis for a bill
 * @param billId - Bill ID
 * @returns Query result with financial network data
 */
export function useBillFinancialNetworkAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: billsKeys.financialAnalysis(billId!),
    queryFn: () => billsApiService.getBillFinancialNetworkAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// Query Hooks - Metadata
// ============================================================================

/**
 * Fetches available bill categories for filtering
 * @returns Query result with categories array
 */
export function useBillCategories() {
  return useQuery({
    queryKey: billsKeys.categories(),
    queryFn: () => billsApiService.getBillCategories(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

/**
 * Fetches possible bill statuses
 * @returns Query result with statuses array
 */
export function useBillStatuses() {
  return useQuery({
    queryKey: billsKeys.statuses(),
    queryFn: () => billsApiService.getBillStatuses(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// ============================================================================
// Mutation Hooks - Bill Actions
// ============================================================================

/**
 * Mutation hook for tracking/untracking a bill
 * @param billId - Bill ID
 * @returns Mutation object with trackBill function
 */
export function useTrackBill(billId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tracking: boolean) => billsApiService.trackBill(billId, tracking),

    onSuccess: (_, tracking) => {
      queryClient.invalidateQueries({ queryKey: billsKeys.detail(billId) });
      queryClient.invalidateQueries({ queryKey: billsKeys.lists() });

      toast({
        title: tracking ? 'Bill tracked' : 'Bill untracked',
        description: tracking
          ? 'You will receive updates about this bill'
          : 'You will no longer receive updates about this bill',
      });
    },

    onError: (error: Error, tracking) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${tracking ? 'track' : 'untrack'} bill`,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for recording user engagement with bills
 * @param billId - Bill ID
 * @returns Mutation object with recordEngagement function
 */
export function useRecordBillEngagement(billId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (engagement: EngagementPayload) =>
      billsApiService.recordEngagement(billId, engagement),

    retry: false,

    onSuccess: (_, engagement) => {
      // Only invalidate for save/share actions, not views
      if (engagement.type === 'save' || engagement.type === 'share') {
        queryClient.invalidateQueries({ queryKey: billsKeys.detail(billId) });
      }
    },

    onError: (error: Error) => {
      console.error('Failed to record engagement:', error);
    },
  });
}

// ============================================================================
// Mutation Hooks - Comments
// ============================================================================

/**
 * Mutation hook for adding a comment to a bill
 * @param billId - Bill ID
 * @returns Mutation object with addComment function
 */
export function useAddBillComment(billId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CommentPayload) => billsApiService.addBillComment(billId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billsKeys.comments(billId) });
      queryClient.invalidateQueries({ queryKey: billsKeys.detail(billId) });

      toast({
        title: 'Comment added',
        description: 'Your comment has been posted successfully',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment. Please try again',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for voting on comments
 * @returns Mutation object with voteOnComment function
 */
export function useVoteOnComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      commentId,
      voteType,
    }: {
      commentId: string | number;
      voteType: 'up' | 'down';
    }) => billsApiService.voteOnComment(commentId, voteType),

    onSuccess: () => {
      // Invalidate all bill queries to refresh comment counts
      queryClient.invalidateQueries({ queryKey: billsKeys.all });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to vote on comment',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for endorsing comments (expert feature)
 * @returns Mutation object with endorseComment function
 */
export function useEndorseComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (commentId: string | number) => billsApiService.endorseComment(commentId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billsKeys.all });

      toast({
        title: 'Comment endorsed',
        description: 'Your expert endorsement has been recorded',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to endorse comment',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Mutation Hooks - Polls
// ============================================================================

/**
 * Mutation hook for creating polls on bills
 * @param billId - Bill ID
 * @returns Mutation object with createPoll function
 */
export function useCreateBillPoll(billId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreatePollPayload) => billsApiService.createBillPoll(billId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billsKeys.polls(billId) });
      queryClient.invalidateQueries({ queryKey: billsKeys.comments(billId) });

      toast({
        title: 'Poll created',
        description: 'Your poll has been added to the discussion',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll. Please try again',
        variant: 'destructive',
      });
    },
  });
}
