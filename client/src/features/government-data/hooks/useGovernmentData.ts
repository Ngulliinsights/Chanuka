/**
 * Government Data Hooks
 * React hooks for government data management with caching and real-time updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { governmentDataApiService } from '../services/government-data-api.service';
import {
  GovernmentData,
  GovernmentDataQueryParams,
  CreateGovernmentDataRequest,
  UpdateGovernmentDataRequest,
  GovernmentDataType,
  GovernmentDataSource,
  GovernmentDataStatus
} from '@shared/types/api/contracts/government-data.contracts';
import { useToast } from '@client/components/ui/use-toast';

// Query Keys
export const governmentDataKeys = {
  all: ['government-data'] as const,
  lists: () => [...governmentDataKeys.all, 'list'] as const,
  list: (params: Partial<GovernmentDataQueryParams>) => [...governmentDataKeys.lists(), params] as const,
  details: () => [...governmentDataKeys.all, 'detail'] as const,
  detail: (id: string) => [...governmentDataKeys.details(), id] as const,
  stats: () => [...governmentDataKeys.all, 'stats'] as const,
  health: () => [...governmentDataKeys.all, 'health'] as const,
  tags: () => [...governmentDataKeys.all, 'tags'] as const,
  sync: () => [...governmentDataKeys.all, 'sync'] as const,
};

// Main hook for listing government data
export function useGovernmentData(params?: Partial<GovernmentDataQueryParams>) {
  return useQuery({
    queryKey: governmentDataKeys.list(params || {}),
    queryFn: () => governmentDataApiService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for getting single government data item
export function useGovernmentDataItem(id: string) {
  return useQuery({
    queryKey: governmentDataKeys.detail(id),
    queryFn: () => governmentDataApiService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook for government data statistics
export function useGovernmentDataStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...governmentDataKeys.stats(), { dateFrom, dateTo }],
    queryFn: () => governmentDataApiService.getStats(dateFrom, dateTo),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for health status
export function useGovernmentDataHealth() {
  return useQuery({
    queryKey: governmentDataKeys.health(),
    queryFn: () => governmentDataApiService.getHealthStatus(),
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });
}

// Hook for available tags
export function useGovernmentDataTags() {
  return useQuery({
    queryKey: governmentDataKeys.tags(),
    queryFn: () => governmentDataApiService.getTags(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Mutation hooks
export function useCreateGovernmentData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateGovernmentDataRequest) => 
      governmentDataApiService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.stats() });
      toast({
        title: 'Success',
        description: 'Government data created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create government data',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateGovernmentData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGovernmentDataRequest }) =>
      governmentDataApiService.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.stats() });
      toast({
        title: 'Success',
        description: 'Government data updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update government data',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteGovernmentData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => governmentDataApiService.delete(id),
    onSuccess: (response, id) => {
      queryClient.removeQueries({ queryKey: governmentDataKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.stats() });
      toast({
        title: 'Success',
        description: 'Government data deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete government data',
        variant: 'destructive',
      });
    },
  });
}

// Sync operations
export function useSyncGovernmentData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ source, options }: { source?: string; options?: { force?: boolean } }) =>
      source 
        ? governmentDataApiService.syncFromSource(source, options)
        : governmentDataApiService.syncAll(options),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.all });
      toast({
        title: 'Sync Started',
        description: 'Government data sync operation has been initiated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to start sync operation',
        variant: 'destructive',
      });
    },
  });
}

// Advanced hooks
export function useGovernmentDataByType(dataType: GovernmentDataType, params?: Partial<GovernmentDataQueryParams>) {
  return useQuery({
    queryKey: [...governmentDataKeys.lists(), 'by-type', dataType, params],
    queryFn: () => governmentDataApiService.getByType(dataType, params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGovernmentDataBySource(source: GovernmentDataSource, params?: Partial<GovernmentDataQueryParams>) {
  return useQuery({
    queryKey: [...governmentDataKeys.lists(), 'by-source', source, params],
    queryFn: () => governmentDataApiService.getBySource(source, params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentGovernmentData(limit: number = 10) {
  return useQuery({
    queryKey: [...governmentDataKeys.lists(), 'recent', limit],
    queryFn: () => governmentDataApiService.getRecent(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTrendingGovernmentData(period: 'day' | 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: [...governmentDataKeys.lists(), 'trending', period],
    queryFn: () => governmentDataApiService.getTrending(period),
    staleTime: 5 * 60 * 1000,
  });
}

// Search hook with debouncing
export function useGovernmentDataSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResult = useQuery({
    queryKey: [...governmentDataKeys.lists(), 'search', debouncedQuery],
    queryFn: () => governmentDataApiService.search(debouncedQuery),
    enabled: debouncedQuery.length > 2,
    staleTime: 2 * 60 * 1000,
  });

  return {
    searchQuery,
    setSearchQuery,
    ...searchResult,
  };
}

// Advanced search hook
export function useAdvancedGovernmentDataSearch() {
  const [searchParams, setSearchParams] = useState<{
    query?: string;
    filters?: Record<string, any>;
    facets?: string[];
    highlight?: boolean;
  }>({});

  const searchResult = useQuery({
    queryKey: [...governmentDataKeys.lists(), 'advanced-search', searchParams],
    queryFn: () => governmentDataApiService.advancedSearch(searchParams),
    enabled: !!(searchParams.query || Object.keys(searchParams.filters || {}).length > 0),
    staleTime: 2 * 60 * 1000,
  });

  return {
    searchParams,
    setSearchParams,
    updateSearchParams: useCallback((updates: Partial<typeof searchParams>) => {
      setSearchParams(prev => ({ ...prev, ...updates }));
    }, []),
    clearSearch: useCallback(() => {
      setSearchParams({});
    }, []),
    ...searchResult,
  };
}

// Validation hook
export function useValidateGovernmentData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => governmentDataApiService.validateData(id),
    onSuccess: (result) => {
      if (result.isValid) {
        toast({
          title: 'Validation Passed',
          description: `Data validation score: ${result.score}/100`,
        });
      } else {
        toast({
          title: 'Validation Issues Found',
          description: `Found ${result.errors.length} issues. Score: ${result.score}/100`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Validation Failed',
        description: error.message || 'Failed to validate data',
        variant: 'destructive',
      });
    },
  });
}

// Bulk operations
export function useBulkUpdateGovernmentData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: { ids: string[]; updates: Partial<UpdateGovernmentDataRequest> }) =>
      governmentDataApiService.bulkUpdateByIds(request),
    onSuccess: (response, { ids }) => {
      // Invalidate affected queries
      ids.forEach(id => {
        queryClient.invalidateQueries({ queryKey: governmentDataKeys.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.lists() });
      queryClient.invalidateQueries({ queryKey: governmentDataKeys.stats() });
      
      toast({
        title: 'Bulk Update Successful',
        description: `Updated ${ids.length} items`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Update Failed',
        description: error.message || 'Failed to update items',
        variant: 'destructive',
      });
    },
  });
}

// Real-time sync status
export function useSyncStatus() {
  return useQuery({
    queryKey: [...governmentDataKeys.sync(), 'status'],
    queryFn: () => governmentDataApiService.getSyncStatus(),
    refetchInterval: 5 * 1000, // 5 seconds
    staleTime: 2 * 1000, // 2 seconds
  });
}

export function useSyncLogs(limit?: number) {
  return useQuery({
    queryKey: [...governmentDataKeys.sync(), 'logs', limit],
    queryFn: () => governmentDataApiService.getSyncLogs(limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}