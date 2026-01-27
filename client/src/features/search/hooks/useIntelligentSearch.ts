/**
 * useIntelligentSearch Hook
 *
 * Enhanced search hook that uses the dual-engine intelligent search service
 * with caching, error handling, and performance optimization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';

import { useToast } from '@client/lib/hooks/use-toast';
import { useDebounce } from '@client/lib/hooks/useDebounce';
import { logger } from '@client/lib/utils/logger';

import { intelligentSearch } from '../services/intelligent-search';
import type {
  DualSearchRequest,
  CombinedSearchResult,
  SearchEngineResult,
} from '../services/intelligent-search';

// Define types locally
interface AutocompleteResult {
  suggestions: SearchSuggestion[];
  facets: {
    categories: string[];
    sponsors: string[];
    tags: string[];
    statuses: string[];
  };
  query: string;
  totalSuggestions: number;
}

interface SearchSuggestion {
  text: string;
  type: string;
  count?: number;
}

interface UseIntelligentSearchOptions {
  debounceMs?: number;
  enableAutoSearch?: boolean;
  cacheTime?: number;
  staleTime?: number;
  maxRetries?: number;
}

interface SearchState {
  isSearching: boolean;
  hasSearched: boolean;
  lastQuery: string;
  searchTime: number;
  enginePerformance: SearchEngineResult[];
}

export function useIntelligentSearch(options: UseIntelligentSearchOptions = {}) {
  const {
    debounceMs = 300,
    enableAutoSearch = false,
    cacheTime = 10 * 60 * 1000, // 10 minutes
    staleTime = 5 * 60 * 1000, // 5 minutes
    maxRetries = 2,
  } = options;

  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    hasSearched: false,
    lastQuery: '',
    searchTime: 0,
    enginePerformance: [],
  });

  const [currentQuery, setCurrentQuery] = useState<DualSearchRequest | null>(null);
  const debouncedQuery = useDebounce(currentQuery, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Main search query
  const searchQuery = useQuery({
    queryKey: ['intelligent-search', debouncedQuery],
    queryFn: async (): Promise<CombinedSearchResult> => {
      if (!debouncedQuery) {
        throw new Error('No search query provided');
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setSearchState(prev => ({
        ...prev,
        isSearching: true,
        lastQuery: debouncedQuery.q,
      }));

      try {
        const startTime = Date.now();
        const result = await intelligentSearch.search(debouncedQuery);
        const searchTime = Date.now() - startTime;

        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          hasSearched: true,
          searchTime,
          enginePerformance: result.engines,
        }));

        logger.info('Intelligent search completed', {
          query: debouncedQuery.q,
          totalResults: result.totalCount,
          searchTime,
          engines: result.engines.map(e => e.engine),
        });

        return result;
      } catch (error) {
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
        }));

        if (error instanceof Error && error.name === 'AbortError') {
          logger.info('Search request aborted', { query: debouncedQuery.q });
          throw error;
        }

        logger.error('Intelligent search failed', {
          query: debouncedQuery.q,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    },
    enabled: !!debouncedQuery && (enableAutoSearch || searchState.hasSearched),
    staleTime,
    gcTime: cacheTime,
    retry: maxRetries,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Manual search mutation for explicit search triggers
  const searchMutation = useMutation({
    mutationFn: async (request: DualSearchRequest): Promise<CombinedSearchResult> => {
      setCurrentQuery(request);

      // If auto-search is disabled, we need to trigger the query manually
      if (!enableAutoSearch) {
        setSearchState(prev => ({ ...prev, hasSearched: true }));

        // Invalidate and refetch the query
        await queryClient.invalidateQueries({
          queryKey: ['intelligent-search', request],
        });

        const result = await queryClient.fetchQuery({
          queryKey: ['intelligent-search', request],
          queryFn: async () => {
            const startTime = Date.now();
            const searchResult = await intelligentSearch.search(request);
            const searchTime = Date.now() - startTime;

            setSearchState(prev => ({
              ...prev,
              searchTime,
              enginePerformance: searchResult.engines,
            }));

            return searchResult;
          },
          staleTime: 0, // Force fresh fetch for manual searches
        });

        return result;
      }

      // For auto-search, just set the query and let the query handle it
      return new Promise(resolve => {
        const unsubscribe = queryClient.getQueryCache().subscribe(event => {
          if (
            event.type === 'updated' &&
            event.query.queryKey[0] === 'intelligent-search' &&
            event.query.state.data
          ) {
            resolve(event.query.state.data as CombinedSearchResult);
            unsubscribe();
          }
        });
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Search Failed',
        description: error.message || 'An error occurred while searching.',
        variant: 'destructive',
      });
    },
  });

  // Autocomplete functionality
  const autocompleteQuery = useQuery({
    queryKey: ['search-autocomplete', currentQuery?.q],
    queryFn: (): Promise<AutocompleteResult> => {
      if (!currentQuery?.q || currentQuery.q.length < 2) {
        return Promise.resolve({
          suggestions: [],
          facets: { categories: [], sponsors: [], tags: [], statuses: [] },
          query: currentQuery?.q || '',
          totalSuggestions: 0,
        });
      }

      return intelligentSearch.getAutocomplete(currentQuery.q, {
        limit: 10,
        includeRecent: true,
        includePopular: true,
        includeBillTitles: true,
      });
    },
    enabled: !!currentQuery?.q && currentQuery.q.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Search function
  const search = useCallback(
    (request: DualSearchRequest) => {
      return searchMutation.mutateAsync(request);
    },
    [searchMutation]
  );

  // Set query for auto-search
  const setQuery = useCallback((request: DualSearchRequest | null) => {
    setCurrentQuery(request);
  }, []);

  // Clear search results
  const clearResults = useCallback(() => {
    setCurrentQuery(null);
    setSearchState({
      isSearching: false,
      hasSearched: false,
      lastQuery: '',
      searchTime: 0,
      enginePerformance: [],
    });

    // Clear cache
    queryClient.removeQueries({
      queryKey: ['intelligent-search'],
    });

    intelligentSearch.clearCache();
  }, [queryClient]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string): Promise<SearchSuggestion[]> => {
    try {
      const result = await intelligentSearch.getAutocomplete(query, {
        limit: 5,
        includeRecent: true,
        includePopular: true,
        includeBillTitles: false,
      });
      return result.suggestions;
    } catch (error) {
      logger.error('Failed to get search suggestions', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }, []);

  // Cancel current search
  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSearchState(prev => ({ ...prev, isSearching: false }));
  }, []);

  return {
    // Search state
    results: searchQuery.data || null,
    isLoading: searchQuery.isLoading || searchMutation.isPending || searchState.isSearching,
    error: searchQuery.error || searchMutation.error,
    isSearching: searchState.isSearching,
    hasSearched: searchState.hasSearched,
    searchTime: searchState.searchTime,
    enginePerformance: searchState.enginePerformance,

    // Autocomplete
    autocomplete: autocompleteQuery.data || null,
    isLoadingAutocomplete: autocompleteQuery.isLoading,

    // Actions
    search,
    setQuery,
    clearResults,
    getSuggestions,
    cancelSearch,

    // Current query
    currentQuery,
    lastQuery: searchState.lastQuery,
  };
}

export default useIntelligentSearch;
