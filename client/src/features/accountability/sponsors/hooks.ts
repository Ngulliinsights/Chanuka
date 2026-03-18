/**
 * Sponsors Feature Hooks
 * React Query hooks for sponsors functionality with optimized
 * caching, error handling, and type safety
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { sponsorsApiService } from './services/api';
import { useToast } from '@client/lib/hooks/use-toast';
import { createQueryErrorHandler } from '@client/infrastructure/error';

import type {
  Sponsor,
  SponsorAffiliationInput,
  SponsorTransparencyInput,
  SponsorsQueryParams,
} from './types';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const sponsorsKeys = {
  all: ['sponsors'] as const,
  lists: () => [...sponsorsKeys.all, 'list'] as const,
  list: (params: SponsorsQueryParams) => [...sponsorsKeys.lists(), params] as const,
  details: () => [...sponsorsKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...sponsorsKeys.details(), id] as const,
  affiliations: (sponsorId: string | number) =>
    [...sponsorsKeys.detail(sponsorId), 'affiliations'] as const,
  transparency: (sponsorId: string | number) =>
    [...sponsorsKeys.detail(sponsorId), 'transparency'] as const,
  conflicts: (sponsorId: string | number) =>
    [...sponsorsKeys.detail(sponsorId), 'conflicts'] as const,
  riskProfile: (sponsorId: string | number) =>
    [...sponsorsKeys.detail(sponsorId), 'risk-profile'] as const,
  trends: (sponsorId: string | number, timeframe: number) =>
    [...sponsorsKeys.detail(sponsorId), 'trends', timeframe] as const,
  metadata: () => [...sponsorsKeys.all, 'metadata'] as const,
  parties: () => [...sponsorsKeys.metadata(), 'parties'] as const,
  constituencies: () => [...sponsorsKeys.metadata(), 'constituencies'] as const,
  statistics: () => [...sponsorsKeys.metadata(), 'statistics'] as const,
  conflictMapping: (billId?: string | number) =>
    [...sponsorsKeys.all, 'conflict-mapping', billId] as const,
};

// ============================================================================
// Query Hooks - Core Sponsor Operations
// ============================================================================

/**
 * Fetches a filtered and paginated list of sponsors
 * @param params - Search, filter, and pagination parameters
 * @returns Query result with paginated sponsors data
 */
export function useSponsors(params: SponsorsQueryParams = {}) {
  return useQuery({
    queryKey: sponsorsKeys.list(params),
    queryFn: () => sponsorsApiService.getSponsors(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches a single sponsor's complete details by ID
 * @param id - Sponsor ID
 * @returns Query result with full sponsor data
 */
export function useSponsor(id: string | number | undefined) {
  return useQuery({
    queryKey: sponsorsKeys.detail(id!),
    queryFn: () => sponsorsApiService.getSponsorById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...createQueryErrorHandler(),
  });
}

/**
 * Search sponsors by query string
 * @param query - Search query
 * @param options - Additional search options
 * @returns Query result with matching sponsors
 */
export function useSearchSponsors(query: string, options: SponsorsQueryParams = {}) {
  return useQuery({
    queryKey: sponsorsKeys.list({ ...options, query }),
    queryFn: () => sponsorsApiService.searchSponsors(query, options),
    enabled: !!query && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...createQueryErrorHandler(),
  });
}

// ============================================================================
// Query Hooks - Affiliations
// ============================================================================

/**
 * Fetches all affiliations for a specific sponsor
 * @param sponsorId - Sponsor ID
 * @returns Query result with affiliations array
 */
export function useSponsorAffiliations(sponsorId: string | number | undefined) {
  return useQuery({
    queryKey: sponsorsKeys.affiliations(sponsorId!),
    queryFn: () => sponsorsApiService.getSponsorAffiliations(sponsorId!),
    enabled: !!sponsorId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...createQueryErrorHandler(),
  });
}

// ============================================================================
// Query Hooks - Transparency
// ============================================================================

/**
 * Fetches all transparency records for a specific sponsor
 * @param sponsorId - Sponsor ID
 * @returns Query result with transparency records array
 */
export function useSponsorTransparency(sponsorId: string | number | undefined) {
  return useQuery({
    queryKey: sponsorsKeys.transparency(sponsorId!),
    queryFn: () => sponsorsApiService.getSponsorTransparency(sponsorId!),
    enabled: !!sponsorId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    ...createQueryErrorHandler(),
  });
}

// ============================================================================
// Query Hooks - Conflict Analysis
// ============================================================================

/**
 * Fetches conflict analysis for a specific sponsor
 * @param sponsorId - Sponsor ID
 * @returns Query result with conflict detection results
 */
export function useSponsorConflicts(sponsorId: string | number | undefined) {
  return useQuery({
    queryKey: sponsorsKeys.conflicts(sponsorId!),
    queryFn: () => sponsorsApiService.getSponsorConflicts(sponsorId!),
    enabled: !!sponsorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches risk profile for a specific sponsor
 * @param sponsorId - Sponsor ID
 * @returns Query result with risk profile analysis
 */
export function useSponsorRiskProfile(sponsorId: string | number | undefined) {
  return useQuery({
    queryKey: sponsorsKeys.riskProfile(sponsorId!),
    queryFn: () => sponsorsApiService.getSponsorRiskProfile(sponsorId!),
    enabled: !!sponsorId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches conflict trends for a specific sponsor
 * @param sponsorId - Sponsor ID
 * @param timeframeMonths - Analysis timeframe in months
 * @returns Query result with conflict trend analysis
 */
export function useSponsorConflictTrends(
  sponsorId: string | number | undefined,
  timeframeMonths: number = 12
) {
  return useQuery({
    queryKey: sponsorsKeys.trends(sponsorId!, timeframeMonths),
    queryFn: () => sponsorsApiService.getSponsorConflictTrends(sponsorId!, timeframeMonths),
    enabled: !!sponsorId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches conflict mapping for network visualization
 * @param billId - Optional bill ID to filter conflicts
 * @returns Query result with conflict network mapping
 */
export function useConflictMapping(billId?: string | number) {
  return useQuery({
    queryKey: sponsorsKeys.conflictMapping(billId),
    queryFn: () => sponsorsApiService.getConflictMapping(billId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    ...createQueryErrorHandler(),
  });
}

// ============================================================================
// Query Hooks - Metadata
// ============================================================================

/**
 * Fetches available political parties
 * @returns Query result with parties array
 */
export function useParties() {
  return useQuery({
    queryKey: sponsorsKeys.parties(),
    queryFn: () => sponsorsApiService.getParties(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches available constituencies
 * @returns Query result with constituencies array
 */
export function useConstituencies() {
  return useQuery({
    queryKey: sponsorsKeys.constituencies(),
    queryFn: () => sponsorsApiService.getConstituencies(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    ...createQueryErrorHandler(),
  });
}

/**
 * Fetches sponsor statistics
 * @returns Query result with statistics summary
 */
export function useSponsorStatistics() {
  return useQuery({
    queryKey: sponsorsKeys.statistics(),
    queryFn: () => sponsorsApiService.getStatistics(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    ...createQueryErrorHandler(),
  });
}

// ============================================================================
// Mutation Hooks - Sponsor Management
// ============================================================================

/**
 * Mutation hook for creating a new sponsor
 * @returns Mutation object with createSponsor function
 */
export function useCreateSponsor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (sponsorData: Partial<Sponsor>) => sponsorsApiService.createSponsor(sponsorData),

    onSuccess: newSponsor => {
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.statistics() });

      toast({
        title: 'Sponsor created',
        description: `${newSponsor.name} has been added successfully`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create sponsor',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for updating sponsor information
 * @param sponsorId - Sponsor ID
 * @returns Mutation object with updateSponsor function
 */
export function useUpdateSponsor(sponsorId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (updateData: Partial<Sponsor>) =>
      sponsorsApiService.updateSponsor(sponsorId, updateData),

    onSuccess: updatedSponsor => {
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.detail(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.lists() });

      toast({
        title: 'Sponsor updated',
        description: `${updatedSponsor.name} has been updated successfully`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update sponsor',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for deactivating a sponsor
 * @param sponsorId - Sponsor ID
 * @returns Mutation object with deactivateSponsor function
 */
export function useDeactivateSponsor(sponsorId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => sponsorsApiService.deactivateSponsor(sponsorId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.detail(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.statistics() });

      toast({
        title: 'Sponsor deactivated',
        description: 'The sponsor has been deactivated successfully',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate sponsor',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Mutation Hooks - Affiliations
// ============================================================================

/**
 * Mutation hook for adding sponsor affiliation
 * @param sponsorId - Sponsor ID
 * @returns Mutation object with addAffiliation function
 */
export function useAddSponsorAffiliation(sponsorId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (affiliationData: Omit<SponsorAffiliationInput, 'sponsor_id'>) =>
      sponsorsApiService.addSponsorAffiliation(sponsorId, affiliationData),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.affiliations(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.detail(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.conflicts(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.riskProfile(sponsorId) });

      toast({
        title: 'Affiliation added',
        description: 'The affiliation has been added successfully',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add affiliation',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Mutation Hooks - Transparency
// ============================================================================

/**
 * Mutation hook for adding transparency record
 * @param sponsorId - Sponsor ID
 * @returns Mutation object with addTransparency function
 */
export function useAddSponsorTransparency(sponsorId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (transparencyData: Omit<SponsorTransparencyInput, 'sponsor_id'>) =>
      sponsorsApiService.addSponsorTransparency(sponsorId, transparencyData),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.transparency(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.detail(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.conflicts(sponsorId) });
      queryClient.invalidateQueries({ queryKey: sponsorsKeys.riskProfile(sponsorId) });

      toast({
        title: 'Transparency record added',
        description: 'The transparency record has been added successfully',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transparency record',
        variant: 'destructive',
      });
    },
  });
}
