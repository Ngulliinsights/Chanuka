import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchApi } from '../services/search-api';
import { useToast } from '../../../hooks/use-toast';
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
  SavedSearch,
  SearchHistory,
  SaveSearchRequest
} from '../types';

/**
 * Hook for performing search queries
 */
export function useSearch(query: string, filters?: SearchRequest['filters'], enabled = true) {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchApi.search({ q: query, filters }),
    enabled: enabled && query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for search suggestions/autocomplete
 */
export function useSearchSuggestions(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'suggestions', query],
    queryFn: () => searchApi.getSuggestions(query),
    enabled: enabled && query.length > 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for live search (typeahead)
 */
export function useLiveSearch(query: string, type?: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'live', query, type],
    queryFn: () => searchApi.liveSearch(query, type),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for search history
 */
export function useSearchHistory() {
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: ['search', 'history'],
    queryFn: () => searchApi.getSearchHistory(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const clearHistory = useMutation({
    mutationFn: () => searchApi.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
    },
    onError: (error: Error) => {
      console.error('Failed to clear search history:', error);
    },
  });

  return {
    history,
    clearHistory,
  };
}

/**
 * Hook for saved searches
 */
export function useSavedSearches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const savedSearches = useQuery({
    queryKey: ['search', 'saved'],
    queryFn: () => searchApi.getSavedSearches(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const saveSearch = useMutation({
    mutationFn: (request: SaveSearchRequest) => searchApi.saveSearch(request),
    onSuccess: (savedSearch) => {
      queryClient.invalidateQueries({ queryKey: ['search', 'saved'] });
      toast({
        title: "Search saved",
        description: `"${savedSearch.name}" has been saved for future use.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save search",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSavedSearch = useMutation({
    mutationFn: (searchId: string) => searchApi.deleteSavedSearch(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'saved'] });
      toast({
        title: "Search deleted",
        description: "Saved search has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete search",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeSavedSearch = useMutation({
    mutationFn: (searchId: string) => searchApi.executeSavedSearch(searchId),
    // This returns search results, handled by the calling component
  });

  return {
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    executeSavedSearch,
  };
}

/**
 * Hook for popular searches
 */
export function usePopularSearches(limit = 10) {
  return useQuery({
    queryKey: ['search', 'popular', limit],
    queryFn: () => searchApi.getPopularSearches(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for related searches
 */
export function useRelatedSearches(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'related', query],
    queryFn: () => searchApi.getRelatedSearches(query),
    enabled: enabled && query.length > 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for search metadata (available filters, etc.)
 */
export function useSearchMetadata() {
  return useQuery({
    queryKey: ['search', 'metadata'],
    queryFn: () => searchApi.getSearchMetadata(),
    staleTime: 60 * 60 * 1000, // 1 hour - metadata changes infrequently
  });
}

/**
 * Hook for advanced search with debouncing
 */
export function useAdvancedSearch() {
  const queryClient = useQueryClient();

  const performAdvancedSearch = useMutation({
    mutationFn: (request: SearchRequest) => searchApi.search(request),
    onSuccess: (data, request) => {
      // Cache the results
      queryClient.setQueryData(['search', request.q, request.filters], data);
    },
  });

  return performAdvancedSearch;
}

/**
 * Hook for search result details
 */
export function useSearchResult(resultId: string, type: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'result', type, resultId],
    queryFn: () => searchApi.getSearchResult(resultId, type),
    enabled: enabled && !!resultId && !!type,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for exporting search results
 */
export function useSearchExport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ request, format }: { request: SearchRequest; format?: 'csv' | 'json' }) =>
      searchApi.exportSearchResults(request, format),
    onSuccess: (data, { format }) => {
      // Create download link (assuming data is blob or similar)
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search-results.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Search results exported as ${format?.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for search analytics (admin)
 */
export function useSearchAnalytics() {
  return useQuery({
    queryKey: ['search', 'analytics'],
    queryFn: () => searchApi.getSearchAnalytics(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}





































