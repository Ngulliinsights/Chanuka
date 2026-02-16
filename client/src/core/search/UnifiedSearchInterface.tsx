/**
 * UnifiedSearchInterface Component
 *
 * A wrapper that integrates existing search components with intelligent strategy selection
 * Requirements: 2.1, 2.2, 2.3
 */

import { Search, Mic, X, Loader2 } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

// Import existing search components
import { useIntelligentSearch } from '../../features/search/hooks/useIntelligentSearch';
import { useStreamingSearch } from '../../features/search/hooks/useStreamingSearch';
import { intelligentSearch } from '../../features/search/services/intelligent-search';
import { streamingSearchService } from '../../features/search/services/streaming-search';
import IntelligentAutocomplete from '../../features/search/ui/interface/IntelligentAutocomplete';
import { cn } from '../../lib/design-system/utils/cn';
import { searchApiClient } from '../api/search';

import { SearchStrategySelector, DEFAULT_SEARCH_STRATEGY_CONFIG } from './search-strategy-selector';
import type {
  UnifiedSearchInterfaceProps,
  UnifiedSearchQuery,
  UnifiedSearchResult,
  SearchProgress,
  SearchDecisionMatrix,
} from './types';

export const UnifiedSearchInterface: React.FC<UnifiedSearchInterfaceProps> = ({
  variant = 'page',
  placeholder = 'Search bills, sponsors, or topics...',
  autoFocus = false,
  showFilters = true,
  showSuggestions = true,
  enableVoiceSearch = false,
  className,
  config,
  onSearch,
  onResults,
  onProgress,
  onError,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<string>('intelligent');
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult | null>(null);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  // Initialize strategy selector
  const strategySelector = useMemo(() => {
    const finalConfig = { ...DEFAULT_SEARCH_STRATEGY_CONFIG, ...config };
    return new SearchStrategySelector(finalConfig);
  }, [config]);

  // Search hooks for different strategies
  const intelligentSearchHook = useIntelligentSearch({
    debounceMs: 300,
    enableAutoSearch: false,
  });

  const streamingSearchHook = useStreamingSearch({
    onProgress: progress => {
      onProgress?.({
        loaded: progress.loaded,
        total: progress.total,
        percentage: progress.percentage,
        currentStrategy: 'streaming',
        searchTime: progress.searchTime,
      });
    },
  });

  /**
   * Determine optimal search strategy based on query characteristics
   */
  const determineSearchStrategy = useCallback(
    (searchQuery: string): string => {
      const matrix: SearchDecisionMatrix = {
        query: searchQuery,
        networkCondition: navigator.onLine ? 'fast' : 'offline',
        deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
      };

      const decision = strategySelector.selectStrategy(matrix);
      return decision.strategy;
    },
    [strategySelector]
  );

  /**
   * Execute search using the selected strategy
   */
  const executeSearch = useCallback(
    async (searchQuery: string, strategy?: string) => {
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      const startTime = Date.now();

      try {
        const selectedStrategy = strategy || determineSearchStrategy(searchQuery);
        setCurrentStrategy(selectedStrategy);

        const unifiedQuery: UnifiedSearchQuery = {
          q: searchQuery,
          strategy: selectedStrategy as SearchStrategy,
          limit: strategySelector.getConfig().options.maxResults,
        };

        // Call external search handler
        onSearch?.(unifiedQuery);

        let results: UnifiedSearchResult;

        switch (selectedStrategy) {
          case 'intelligent':
            results = await executeIntelligentSearch(unifiedQuery, startTime);
            break;

          case 'streaming':
            results = await executeStreamingSearch(unifiedQuery, startTime);
            break;

          case 'api':
          default:
            results = await executeApiSearch(unifiedQuery, startTime);
            break;
        }

        setSearchResults(results);
        onResults?.(results);
      } catch (error) {
        console.error('Search failed:', error);
        onError?.(error as Error);

        // Try fallback strategy
        const fallbackStrategy = strategySelector.getConfig().fallbackStrategy;
        if (fallbackStrategy && fallbackStrategy !== currentStrategy) {
          try {
            await executeSearch(searchQuery, fallbackStrategy);
          } catch (fallbackError) {
            console.error('Fallback search also failed:', fallbackError);
          }
        }
      } finally {
        setIsSearching(false);
      }
    },
    [determineSearchStrategy, strategySelector, onSearch, onResults, onError, currentStrategy]
  );

  /**
   * Execute intelligent search
   */
  const executeIntelligentSearch = async (
    query: UnifiedSearchQuery,
    startTime: number
  ): Promise<UnifiedSearchResult> => {
    const response = await intelligentSearch.search({
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      filters: query.filters,
    });

    return {
      results: response.results,
      metadata: {
        strategy: 'intelligent',
        fallbackUsed: false,
        searchTime: Date.now() - startTime,
        totalResults: response.results.length,
      },
      suggestions: response.suggestions?.map(s => typeof s === 'string' ? s : s.text || s.term || '') || [],
      facets: response.facets,
    };
  };

  /**
   * Execute streaming search
   */
  const executeStreamingSearch = async (
    query: UnifiedSearchQuery,
    startTime: number
  ): Promise<UnifiedSearchResult> => {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      streamingSearchService.startStreamingSearch(
        {
          q: query.q,
          limit: query.limit,
          offset: query.offset,
          filters: query.filters,
        },
        {
          onResult: result => {
            results.push(result);
          },
          onComplete: (finalResults, totalCount) => {
            resolve({
              results: finalResults,
              metadata: {
                strategy: 'streaming',
                fallbackUsed: false,
                searchTime: Date.now() - startTime,
                totalResults: totalCount,
                query: query.q,
                executionTime: Date.now() - startTime,
              },
            });
          },
          onError: reject,
          maxResults: query.limit,
        }
      );
    });
  };

  /**
   * Execute API search
   */
  const executeApiSearch = async (
    query: UnifiedSearchQuery,
    startTime: number
  ): Promise<UnifiedSearchResult> => {
    const response = await searchApiClient.search({
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      filters: query.filters,
    });

    const mappedResults: any[] = response.results.map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.description || '',
      excerpt: item.description || '',
      relevanceScore: item.score || 0,
      metadata: item.metadata || {},
      highlights: [],
    }));

    return {
      results: mappedResults,
      metadata: {
        strategy: 'api',
        fallbackUsed: false,
        searchTime: Date.now() - startTime,
        totalResults: response.results.length,
      },
      // Facets might need mapping too, but let's assume API structure aligns or is ignored for now
    };
  };

  /**
   * Handle search input changes
   */
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setShowSuggestionsDropdown(value.length > 0 && showSuggestions);
    },
    [showSuggestions]
  );

  /**
   * Handle search submission
   */
  const handleSearch = useCallback(
    (searchQuery?: string) => {
      const finalQuery = searchQuery || query;
      if (finalQuery.trim()) {
        setShowSuggestionsDropdown(false);
        executeSearch(finalQuery);
      }
    },
    [query, executeSearch]
  );

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback(
    (suggestion: string | { term?: string; text?: string }) => {
      const value = typeof suggestion === 'string' 
        ? suggestion 
        : (suggestion.term || suggestion.text || '');
      
      if (value) {
        setQuery(value);
        setShowSuggestionsDropdown(false);
        executeSearch(value);
      }
    },
    [executeSearch]
  );

  /**
   * Clear search
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setSearchResults(null);
    setShowSuggestionsDropdown(false);
  }, []);

  /**
   * Handle voice search (placeholder)
   */
  const handleVoiceSearch = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Voice search implementation would go here
      console.log('Voice search not implemented yet');
    }
  }, []);

  // Render different variants
  const renderSearchInput = () => {
    const baseClasses = cn(
      'flex items-center gap-2 border rounded-lg bg-background',
      'focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
      variant === 'header' && 'h-9 px-3',
      variant === 'page' && 'h-12 px-4',
      variant === 'embedded' && 'h-10 px-3',
      className
    );

    return (
      <div className={baseClasses}>
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />

        <input
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            } else if (e.key === 'Escape') {
              setShowSuggestionsDropdown(false);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'flex-1 bg-transparent border-0 outline-none',
            'placeholder:text-muted-foreground',
            variant === 'header' && 'text-sm',
            variant === 'page' && 'text-base',
            variant === 'embedded' && 'text-sm'
          )}
          disabled={isSearching}
        />

        {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-muted rounded-sm"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {enableVoiceSearch && (
          <button
            onClick={handleVoiceSearch}
            className="p-1 hover:bg-muted rounded-sm"
            aria-label="Voice search"
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {renderSearchInput()}

      {/* Suggestions dropdown */}
      {showSuggestionsDropdown && query && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <IntelligentAutocomplete
            onSelect={handleSuggestionSelect}
            onSearch={handleSearch}
            className="border rounded-lg shadow-lg bg-background"
          />
        </div>
      )}

      {/* Search status indicator */}
      {isSearching && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1 p-2 text-xs text-muted-foreground bg-muted/50 rounded border">
          Searching with {currentStrategy} strategy...
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchInterface;
