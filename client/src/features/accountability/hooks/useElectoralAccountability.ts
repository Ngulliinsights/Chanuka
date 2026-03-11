/**
 * Electoral Accountability Hooks
 * 
 * React hooks for Electoral Accountability data fetching with React Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { electoralAccountabilityApi } from '../services/electoral-accountability-api';
import type {
  VotingRecord,
  ConstituencySentiment,
  RepresentativeGapAnalysis,
  ElectoralPressureCampaign,
  MPScorecard,
  GetVotingRecordOptions,
  GetCriticalGapsOptions,
  CreateCampaignData,
  GetCampaignsOptions,
} from '../types';

// Query Keys
export const electoralAccountabilityKeys = {
  all: ['electoral-accountability'] as const,
  votingRecords: (options: GetVotingRecordOptions) =>
    [...electoralAccountabilityKeys.all, 'voting-records', options] as const,
  sentiment: (billId: string, constituency: string) =>
    [...electoralAccountabilityKeys.all, 'sentiment', billId, constituency] as const,
  criticalGaps: (options?: GetCriticalGapsOptions) =>
    [...electoralAccountabilityKeys.all, 'critical-gaps', options] as const,
  campaigns: (options?: GetCampaignsOptions) =>
    [...electoralAccountabilityKeys.all, 'campaigns', options] as const,
  scorecard: (sponsorId: string, constituency: string) =>
    [...electoralAccountabilityKeys.all, 'scorecard', sponsorId, constituency] as const,
};

/**
 * Hook to fetch MP voting record
 */
export function useMPVotingRecord(
  options: GetVotingRecordOptions,
  queryOptions?: Omit<UseQueryOptions<VotingRecord[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: electoralAccountabilityKeys.votingRecords(options),
    queryFn: () => electoralAccountabilityApi.getMPVotingRecord(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to fetch constituency sentiment
 */
export function useConstituencySentiment(
  billId: string,
  constituency: string,
  queryOptions?: Omit<UseQueryOptions<ConstituencySentiment>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: electoralAccountabilityKeys.sentiment(billId, constituency),
    queryFn: () => electoralAccountabilityApi.getConstituencySentiment(billId, constituency),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!billId && !!constituency,
    ...queryOptions,
  });
}

/**
 * Hook to fetch critical gaps
 */
export function useCriticalGaps(
  options?: GetCriticalGapsOptions,
  queryOptions?: Omit<UseQueryOptions<RepresentativeGapAnalysis[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: electoralAccountabilityKeys.criticalGaps(options),
    queryFn: () => electoralAccountabilityApi.getCriticalGaps(options),
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...queryOptions,
  });
}

/**
 * Hook to fetch pressure campaigns
 */
export function usePressureCampaigns(
  options?: GetCampaignsOptions,
  queryOptions?: Omit<UseQueryOptions<ElectoralPressureCampaign[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: electoralAccountabilityKeys.campaigns(options),
    queryFn: () => electoralAccountabilityApi.getPressureCampaigns(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to fetch MP scorecard
 */
export function useMPScorecard(
  sponsorId: string,
  constituency: string,
  queryOptions?: Omit<UseQueryOptions<MPScorecard>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: electoralAccountabilityKeys.scorecard(sponsorId, constituency),
    queryFn: () => electoralAccountabilityApi.getMPScorecard(sponsorId, constituency),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!sponsorId && !!constituency,
    ...queryOptions,
  });
}

/**
 * Hook to create pressure campaign
 */
export function useCreatePressureCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignData) =>
      electoralAccountabilityApi.createPressureCampaign(data),
    onSuccess: () => {
      // Invalidate campaigns query to refetch
      queryClient.invalidateQueries({
        queryKey: electoralAccountabilityKeys.all,
      });
    },
  });
}

/**
 * Combined hook for all electoral accountability data
 */
export function useElectoralAccountability(
  sponsorId: string,
  constituency: string,
  options?: {
    includeVotingRecords?: boolean;
    includeCriticalGaps?: boolean;
    includeCampaigns?: boolean;
  }
) {
  const scorecard = useMPScorecard(sponsorId, constituency);

  const votingRecords = useMPVotingRecord(
    {
      sponsorId,
      constituency,
      includeGapAnalysis: true,
    },
    {
      enabled: options?.includeVotingRecords !== false,
    }
  );

  const criticalGaps = useCriticalGaps(
    {
      sponsorId,
      constituency,
      minRiskScore: 50,
    },
    {
      enabled: options?.includeCriticalGaps !== false,
    }
  );

  const campaigns = usePressureCampaigns(
    {
      sponsorId,
      constituency,
      status: 'active',
    },
    {
      enabled: options?.includeCampaigns !== false,
    }
  );

  return {
    scorecard,
    votingRecords,
    criticalGaps,
    campaigns,
    isLoading:
      scorecard.isLoading ||
      votingRecords.isLoading ||
      criticalGaps.isLoading ||
      campaigns.isLoading,
    isError:
      scorecard.isError ||
      votingRecords.isError ||
      criticalGaps.isError ||
      campaigns.isError,
    error:
      scorecard.error ||
      votingRecords.error ||
      criticalGaps.error ||
      campaigns.error,
  };
}
