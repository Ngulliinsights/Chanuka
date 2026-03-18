/**
 * Government Data React Query Hooks
 * Optimized data fetching with intelligent caching and error handling
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from '@client/lib/hooks/use-toast';
import { governmentDataApiService } from './services/api';
import {
  GovernmentData,
  GovernmentDataListResponse,
  GovernmentDataResponse,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  GovernmentDataMetadata,
  GovernmentSyncLog,
  SyncTriggerOptions,
  SyncStatus,
  HealthStatus,
  SearchOptions,
  SearchResult,
  DataAnalytics,
} from './types';

// ==========================================================================
// Query Keys
// ==========================================================================

export const governmentDataKeys = {
  all: ['government-data'] as const,
  lists: () => [...governmentDataKeys.all, 'list'] as const,
  list: (options: GovernmentDataQueryOptions) => [...governmentDataKeys.lists(), options] as const,
  details: () => [...governmentDataKeys.all, 'detail'] as const,
  detail: (id: number) => [...governmentDataKeys.details(), id] as const,
  external: (source: string, externalId: string) =>
    [...governmentDataKeys.all, 'external', source, externalId] as const,
  search: (options: SearchOptions) => [...governmentDataKeys.all, 'search', options] as const,
  metadata: () => [...governmentDataKeys.all, 'metadata'] as const,
  dataTypes: () => [...governmentDataKeys.metadata(), 'data-types'] as const,
  sources: () => [...governmentDataKeys.metadata(), 'sources'] as const,
  statistics: () => [...governmentDataKeys.metadata(), 'statistics'] as const,
  analytics: () => [...governmentDataKeys.all, 'analytics'] as const,
  syncLogs: (source?: string, limit?: number) =>
    [...governmentDataKeys.all, 'sync-logs', source, limit] as const,
  health: () => [...governmentDataKeys.all, 'health'] as const,
};

// ==========================================================================
// Query Hooks
// ==========================================================================

/**
 * Hook to fetch government data list with filtering and pagination
 */
export function useGovernmentDataList(
  options: GovernmentDataQueryOptions = {},
  queryOptions?: Omit<UseQueryOptions<GovernmentDataListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.list(options),
    queryFn: () => governmentDataApiService.list(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch government data by ID
 */
export function useGovernmentData(
  id: number,
  queryOptions?: Omit<UseQueryOptions<GovernmentDataResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.detail(id),
    queryFn: () => governmentDataApiService.getById(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    enabled: !!id,
    ...queryOptions,
  });
}

/**
 * Hook to fetch government data by external ID and source
 */
export function useGovernmentDataByExternalId(
  source: string,
  externalId: string,
  queryOptions?: Omit<UseQueryOptions<GovernmentDataResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.external(source, externalId),
    queryFn: () => governmentDataApiService.getByExternalId(source, externalId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    enabled: !!(source && externalId),
    ...queryOptions,
  });
}

/**
 * Hook to search government data
 */
export function useGovernmentDataSearch(
  options: SearchOptions,
  queryOptions?: Omit<UseQueryOptions<SearchResult>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.search(options),
    queryFn: () => governmentDataApiService.search(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!options.query,
    ...queryOptions,
  });
}

/**
 * Hook to fetch data types
 */
export function useGovernmentDataTypes(
  queryOptions?: Omit<UseQueryOptions<{ success: boolean; data: string[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.dataTypes(),
    queryFn: () => governmentDataApiService.getDataTypes(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch sources
 */
export function useGovernmentDataSources(
  queryOptions?: Omit<UseQueryOptions<{ success: boolean; data: string[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: governmentDataKeys.sources(),
    queryFn: () => governmentDataApiService.getSources(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch statistics
 */
export function useGovernmentDataStatistics(
  queryOptions?: Omit<
    UseQueryOptions<{
      success: boolean;
      data: {
        total: number;
        byDataType: Record<string, number>;
        bySource: Record<string, number>;
        byStatus: Record<string, number>;
      };
    }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: governmentDataKeys.statistics(),
    queryFn: () => governmentDataApiService.getStatistics(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch complete metadata
 */
export function useGovernmentDataMetadata(
  queryOptions?: Omit<
    UseQueryOptions<{ success: boolean; data: GovernmentDataMetadata }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: governmentDataKeys.metadata(),
    queryFn: () => governmentDataApiService.getMetadata(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch analytics data
 */
export function useGovernmentDataAnalytics(
  queryOptions?: Omit<
    UseQueryOptions<{ success: boolean; data: DataAnalytics }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: governmentDataKeys.analytics(),
    queryFn: () => governmentDataApiService.getAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch sync logs
 */
export function useGovernmentDataSyncLogs(
  source?: string,
  limit: number = 50,
  queryOptions?: Omit<
    UseQueryOptions<{ success: boolean; data: GovernmentSyncLog[] }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: governmentDataKeys.syncLogs(source, limit),
    queryFn: () => governmentDataApiService.getSyncLogs(source, limit),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    ...queryOptions,
  });
}

/**
 * Hook to fetch health status
 */
export function useGovernmentDataHealth(
  queryOptions?: Omit<
    UseQueryOptions<{ success: boolean; data: HealthStatus }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: governmentDataKeys.health(),
    queryFn: () => governmentDataApiService.getHealth(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...queryOptions,
  });
}

// ==========================================================================
// Mutation Hooks
// ==========================================================================

/**
 * Hook to create government data
 */
export function useCreateGovernmentData(
  mutationOptions?: UseMutationOptions<GovernmentDataResponse, Error, GovernmentDataCreateInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GovernmentDataCreateInput) => governmentDataApiService.create(input),
    onSuccess: (_response) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.metadata() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.analytics() });

      toast({ title: 'Government data created successfully' });
    },
    onError: (error: Error) => {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: message, variant: 'destructive' });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update government data
 */
export function useUpdateGovernmentData(
  mutationOptions?: UseMutationOptions<
    GovernmentDataResponse,
    Error,
    { id: number; input: GovernmentDataUpdateInput }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: GovernmentDataUpdateInput }) =>
      governmentDataApiService.update(id, input),
    onSuccess: (_response, { id }) => {
      // Update the specific item in cache
      queryClient.setQueryData(governmentDataKeys.detail(id), _response);

      // Invalidate list queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.analytics() });

      toast({ title: 'Government data updated successfully' });
    },
    onError: (error: Error) => {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: message, variant: 'destructive' });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete government data
 */
export function useDeleteGovernmentData(
  mutationOptions?: UseMutationOptions<{ success: boolean; message: string }, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => governmentDataApiService.delete(id),
    onSuccess: (_response, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: governmentDataKeys.detail(id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.analytics() });

      toast({ title: 'Government data deleted successfully' });
    },
    onError: (error: Error) => {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: message, variant: 'destructive' });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to trigger data synchronization
 */
export function useTriggerSync(
  mutationOptions?: UseMutationOptions<
    { success: boolean; data: SyncStatus },
    Error,
    SyncTriggerOptions
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: SyncTriggerOptions) => governmentDataApiService.triggerSync(options),
    onSuccess: () => {
      // Invalidate sync logs to show the new sync
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.syncLogs() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.health() });

      toast({ title: 'Data synchronization triggered successfully' });
    },
    onError: (error: Error) => {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: message, variant: 'destructive' });
    },
    ...mutationOptions,
  });
}

// ==========================================================================
// Utility Hooks
// =========================================================================

/**
 * Hook to prefetch government data
 */
export function usePrefetchGovernmentData() {
  const queryClient = useQueryClient();

  const prefetchList = (options: GovernmentDataQueryOptions = {}) => {
    queryClient.prefetchQuery({
      queryKey: governmentDataKeys.list(options),
      queryFn: () => governmentDataApiService.list(options),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchDetail = (id: number) => {
    queryClient.prefetchQuery({
      queryKey: governmentDataKeys.detail(id),
      queryFn: () => governmentDataApiService.getById(id),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchMetadata = () => {
    queryClient.prefetchQuery({
      queryKey: governmentDataKeys.metadata(),
      queryFn: () => governmentDataApiService.getMetadata(),
      staleTime: 30 * 60 * 1000,
    });
  };

  return {
    prefetchList,
    prefetchDetail,
    prefetchMetadata,
  };
}

/**
 * Hook to invalidate government data queries
 */
export function useInvalidateGovernmentData() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: governmentDataKeys.all });
  };

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
  };

  const invalidateDetail = (id: number) => {
    queryClient.invalidateQueries({ queryKey: governmentDataKeys.detail(id) });
  };

  const invalidateMetadata = () => {
    queryClient.invalidateQueries({ queryKey: governmentDataKeys.metadata() });
  };

  return {
    invalidateAll,
    invalidateLists,
    invalidateDetail,
    invalidateMetadata,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticGovernmentData() {
  const queryClient = useQueryClient();

  const updateOptimistically = (id: number, updates: Partial<GovernmentData>) => {
    queryClient.setQueryData(
      governmentDataKeys.detail(id),
      (old: GovernmentDataResponse | undefined) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, ...updates, updated_at: new Date() },
        };
      }
    );
  };

  const revertOptimisticUpdate = (id: number) => {
    queryClient.invalidateQueries({ queryKey: governmentDataKeys.detail(id) });
  };

  return {
    updateOptimistically,
    revertOptimisticUpdate,
  };
}
