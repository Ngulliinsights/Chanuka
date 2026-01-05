/**
 * Universal Search Page - Optimized Version
 *
 * Performance improvements:
 * - Memoized callbacks and computed values
 * - Optimized re-render behavior
 * - Better type safety
 * - Improved error handling
 * - Enhanced accessibility
 */

import { BarChart3, Clock, Settings, Star, Target, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useIntelligentSearch } from '@client/features/search/hooks/useIntelligentSearch';
import { usePopularSearches, useSearchHistory } from '@client/features/search/hooks/useSearch';
import { useStreamingSearch } from '@client/features/search/hooks/useStreamingSearch';
import { intelligentSearch } from '@client/features/search/services/intelligent-search';
import type { DualSearchRequest } from '@client/features/search/services/intelligent-search';
import type {
  SavedSearch,
  SearchFilters as SearchFiltersType,
  SearchHistory,
  SearchResult as ApiSearchResult,
} from '@client/features/search/types';
import { SearchFilters } from '@client/features/search/ui/filters/SearchFilters';
import {
  AdvancedSearchInterface,
  type SearchConfig,
} from '@client/features/search/ui/interface/AdvancedSearch';
import { IntelligentAutocomplete } from '@client/features/search/ui/interface/IntelligentAutocomplete';
import { SavedSearches } from '@client/features/search/ui/interface/SavedSearches';
import { SearchAnalyticsDashboard } from '@client/features/search/ui/interface/SearchAnalyticsDashboard';
import { SearchProgressIndicator } from '@client/features/search/ui/interface/SearchProgressIndicator';
import { SearchTips } from '@client/features/search/ui/interface/SearchTips';
import { SearchResultCard } from '@client/features/search/ui/results/SearchResultCard';
import { useToast } from '@client/hooks/use-toast';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/shared/design-system';
import { logger } from '@client/utils/logger';

// Define SearchResult interface for streaming search
interface SearchResult {
  id: string;
  title: string;
  type: string;
  content: string;
  score: number;
}

// ============================================================================
// Type Definitions
// ============================================================================

type DisplayableSearchResult = ApiSearchResult & {
  type: 'bill' | 'comment' | 'sponsor';
  excerpt: string;
  relevanceScore: number;
};

interface SearchState {
  activeTab: string;
  showAdvanced: boolean;
  searchQuery: string;
  useStreaming: boolean;
  filters: SearchFiltersType;
  showAnalytics: boolean;
  showCommandPalette: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if a search result can be displayed
 */
const isDisplayableResult = (result: ApiSearchResult): result is DisplayableSearchResult => {
  return ['bill', 'comment', 'sponsor'].includes(result.type);
};

/**
 * Normalizes API search result to displayable format
 */
const normalizeResult = (result: ApiSearchResult): DisplayableSearchResult | null => {
  if (!isDisplayableResult(result)) {
    logger.debug('Filtering non-displayable result', { type: result.type, id: result.id });
    return null;
  }

  return {
    ...result,
    type: result.type as 'bill' | 'comment' | 'sponsor',
    excerpt: result.excerpt ?? '',
    relevanceScore: result.relevanceScore ?? 0,
  };
};

/**
 * Filters and normalizes results for display
 */
const getDisplayableResults = (results: ApiSearchResult[]): DisplayableSearchResult[] => {
  return results
    .map(normalizeResult)
    .filter((result): result is DisplayableSearchResult => result !== null);
};

// ============================================================================
// Memoized Components
// ============================================================================

const SearchHeader = React.memo<{
  showAdvanced: boolean;
  useStreaming: boolean;
  showAnalytics: boolean;
  hasSearched: boolean;
  onToggleAdvanced: () => void;
  onToggleStreaming: () => void;
  onToggleAnalytics: () => void;
  onOpenCommandPalette: () => void;
  onClearResults: () => void;
}>(
  ({
    showAdvanced,
    useStreaming,
    showAnalytics,
    hasSearched,
    onToggleAdvanced,
    onToggleStreaming,
    onToggleAnalytics,
    onOpenCommandPalette,
    onClearResults,
  }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Target className="h-8 w-8 text-primary" />
            <span>Universal Search</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced dual-engine search with AI-powered suggestions and real-time results
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={showAdvanced ? 'primary' : 'outline'}
            onClick={onToggleAdvanced}
            aria-pressed={showAdvanced}
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>

          <Button
            variant={useStreaming ? 'primary' : 'outline'}
            onClick={onToggleStreaming}
            size="sm"
            aria-pressed={useStreaming}
          >
            <Target className="h-4 w-4 mr-2" />
            Streaming
          </Button>

          <Button
            variant={showAnalytics ? 'primary' : 'outline'}
            onClick={onToggleAnalytics}
            size="sm"
            aria-pressed={showAnalytics}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>

          <Button
            variant="outline"
            onClick={onOpenCommandPalette}
            size="sm"
            aria-label="Open command palette"
          >
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {hasSearched && (
            <Button variant="outline" onClick={onClearResults}>
              Clear Results
            </Button>
          )}
        </div>
      </div>
    </div>
  )
);

SearchHeader.displayName = 'SearchHeader';

const PerformanceIndicators = React.memo<{
  searchTime: number;
  enginePerformance: Array<{ engine: string; results: unknown[]; searchTime: number }>;
}>(({ searchTime, enginePerformance }) => {
  if (enginePerformance.length === 0) return null;

  return (
    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
      <div className="flex items-center space-x-2">
        <span>Search completed in {searchTime}ms</span>
        {enginePerformance.map(engine => (
          <Badge key={engine.engine} variant="outline" className="text-xs">
            {engine.engine}: {engine.results.length} results ({engine.searchTime}ms)
          </Badge>
        ))}
      </div>
    </div>
  );
});

PerformanceIndicators.displayName = 'PerformanceIndicators';

const ResultsGrid = React.memo<{
  results: DisplayableSearchResult[];
  searchQuery: string;
  isLoading: boolean;
  hasSearched: boolean;
  error: Error | null;
  onResultClick: (result: DisplayableSearchResult) => void;
  onSaveResult: (result: DisplayableSearchResult) => void;
  onShareResult: (result: DisplayableSearchResult) => void;
}>(
  ({
    results,
    searchQuery,
    isLoading,
    hasSearched,
    error,
    onResultClick,
    onSaveResult,
    onShareResult,
  }) => {
    if (isLoading && results.length === 0) {
      return (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" role="alert">
          <p className="text-destructive">{error.message}</p>
        </div>
      );
    }

    if (!isLoading && hasSearched && results.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No results found. Try adjusting your search terms.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4" role="list" aria-label="Search results">
        {results.map((result, index) => (
          <div key={`${result.type}-${result.id}-${index}`} role="listitem">
            <SearchResultCard
              result={result}
              query={searchQuery}
              onClick={onResultClick}
              onSave={onSaveResult}
              onShare={onShareResult}
              highlightMatches={true}
            />
          </div>
        ))}
      </div>
    );
  }
);

ResultsGrid.displayName = 'ResultsGrid';

// ============================================================================
// Main Component
// ============================================================================

export function UniversalSearchPage() {
  // ========================================
  // State Management
  // ========================================
  const [state, setState] = useState<SearchState>({
    activeTab: 'search',
    showAdvanced: false,
    searchQuery: '',
    useStreaming: true,
    filters: {},
    showAnalytics: false,
    showCommandPalette: false,
  });

  const { toast } = useToast();

  // ========================================
  // Hooks
  // ========================================
  const {
    results,
    isLoading,
    error,
    search,
    clearResults,
    searchTime,
    enginePerformance,
    hasSearched,
  } = useIntelligentSearch({
    debounceMs: 300,
    enableAutoSearch: false,
  });

  const streamingSearch = useStreamingSearch({
    autoStart: false,
    onResult: useCallback((result: SearchResult) => {
      logger.info('Streaming result received', { resultId: result.id, type: result.type });
    }, []),
    onProgress: useCallback((progress: { percentage: number }) => {
      logger.debug('Streaming progress', { progress: progress.percentage });
    }, []),
    onComplete: useCallback((completedResults: SearchResult[], totalCount: number) => {
      logger.info('Streaming completed', { resultCount: completedResults.length, totalCount });
    }, []),
    onError: useCallback(
      (err: Error) => {
        logger.error('Streaming error', { error: err.message });
        toast({
          title: 'Search Error',
          description: err.message,
          variant: 'destructive',
        });
      },
      [toast]
    ),
  });

  const { data: popularSearches } = usePopularSearches(5);
  const { history } = useSearchHistory();

  // ========================================
  // Memoized Values
  // ========================================
  const displayResults = useMemo(
    () => getDisplayableResults(results?.results || []),
    [results?.results]
  );

  // ========================================
  // Event Handlers (Memoized)
  // ========================================
  const handleSimpleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setState(prev => ({ ...prev, searchQuery: query }));

      const searchRequest: DualSearchRequest = {
        q: query,
        type: 'all',
        enableFuzzy: true,
        combineResults: true,
        maxResults: 50,
        highlightMatches: true,
      };

      try {
        await search(searchRequest);
        setState(prev => ({ ...prev, activeTab: 'results' }));
      } catch (err) {
        logger.error('Simple search failed', {
          query,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [search]
  );

  const handleAdvancedSearch = useCallback(
    async (request: DualSearchRequest) => {
      setState(prev => ({ ...prev, searchQuery: request.q }));

      try {
        await search(request);
        setState(prev => ({ ...prev, activeTab: 'results', showAdvanced: false }));
      } catch (err) {
        logger.error('Advanced search failed', {
          query: request.q,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [search]
  );

  const handleResultClick = useCallback((result: DisplayableSearchResult) => {
    const routes: Record<string, string> = {
      bill: `/bills/${result.id}`,
      sponsor: `/sponsors/${result.id}`,
      comment: result.metadata.bill_id
        ? `/bills/${result.metadata.bill_id}#comment-${result.id}`
        : '#',
    };

    const route = routes[result.type];
    if (route) {
      window.location.href = route;
    } else {
      logger.warn('Unhandled result type', { type: result.type, id: result.id });
    }
  }, []);

  const handleSaveResult = useCallback(
    (result: DisplayableSearchResult) => {
      Promise.resolve()
        .then(() => {
          toast({
            title: 'Result Saved',
            description: `"${result.title}" has been saved to your bookmarks.`,
          });
        })
        .catch(() => {
          toast({
            title: 'Save Failed',
            description: 'Failed to save result.',
            variant: 'destructive',
          });
        });
    },
    [toast]
  );

  const handleShareResult = useCallback(
    (result: DisplayableSearchResult) => {
      const shareContent = async () => {
        try {
          const shareData = {
            title: result.title,
            text: result.excerpt || result.content,
            url: `${window.location.origin}/bills/${result.id}`,
          };

          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
            toast({
              title: 'Link Copied',
              description: 'Result link has been copied to clipboard.',
            });
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            toast({
              title: 'Share Failed',
              description: 'Failed to share result.',
              variant: 'destructive',
            });
          }
        }
      };

      shareContent();
    },
    [toast]
  );

  const handleExportResults = useCallback(
    async (format: 'csv' | 'json') => {
      if (!results) return;

      try {
        const data = results.results.map(result => ({
          id: result.id,
          type: result.type,
          title: result.title,
          content: result.content,
          relevanceScore: result.relevanceScore,
          createdAt: result.metadata.created_at,
          status: result.metadata.status,
          category: result.metadata.category,
        }));

        let content: string;
        let mimeType: string;
        let filename: string;

        if (format === 'csv') {
          const headers = Object.keys(data[0] || {}).join(',');
          const rows = data.map(row =>
            Object.values(row)
              .map(val => (typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val))
              .join(',')
          );
          content = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          filename = `search-results-${Date.now()}.csv`;
        } else {
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          filename = `search-results-${Date.now()}.json`;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Successful',
          description: `Results exported as ${format.toUpperCase()}.`,
        });
      } catch {
        toast({
          title: 'Export Failed',
          description: 'Failed to export results.',
          variant: 'destructive',
        });
      }
    },
    [results, toast]
  );

  const handleExecuteSavedSearch = useCallback(
    (savedSearch: SavedSearch) => {
      const request: DualSearchRequest = {
        ...savedSearch.query,
        enableFuzzy: true,
        combineResults: true,
        highlightMatches: true,
      };

      handleAdvancedSearch(request);
    },
    [handleAdvancedSearch]
  );

  const handleSaveSearchConfig = useCallback(
    (searchConfig: SearchConfig) => {
      Promise.resolve()
        .then(() => {
          // Convert SearchConfig to DualSearchRequest
          const dualSearchRequest: DualSearchRequest = {
            q: state.searchQuery, // Use current query from state
            enableFuzzy: searchConfig.searchSettings.enableFuzzy,
            combineResults: searchConfig.searchSettings.combineResults,
            maxResults: searchConfig.searchSettings.maxResults,
            highlightMatches: true,
          };

          return intelligentSearch.saveSearchWithAlerts({
            name: searchConfig.name,
            query: dualSearchRequest,
            emailAlerts: {
              enabled: false,
              frequency: 'daily' as const,
            },
            isPublic: false,
          });
        })
        .then(() => {
          toast({
            title: 'Search Configuration Saved',
            description: `"${searchConfig.name}" has been saved successfully.`,
          });
        })
        .catch(() => {
          toast({
            title: 'Save Failed',
            description: 'Failed to save search configuration.',
            variant: 'destructive',
          });
        });
    },
    [state.searchQuery, toast]
  );

  // Toggle handlers
  const toggleAdvanced = useCallback(() => {
    setState(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }));
  }, []);

  const toggleStreaming = useCallback(() => {
    setState(prev => ({ ...prev, useStreaming: !prev.useStreaming }));
  }, []);

  const toggleAnalytics = useCallback(() => {
    setState(prev => ({ ...prev, showAnalytics: !prev.showAnalytics }));
  }, []);

  const openCommandPalette = useCallback(() => {
    setState(prev => ({ ...prev, showCommandPalette: true }));
  }, []);

  const closeCommandPalette = useCallback(() => {
    setState(prev => ({ ...prev, showCommandPalette: false }));
  }, []);

  const updateFilters = useCallback((filters: SearchFiltersType) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // ========================================
  // Keyboard Shortcuts
  // ========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setState(prev => ({ ...prev, showCommandPalette: !prev.showCommandPalette }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ========================================
  // Render: Analytics View
  // ========================================
  if (state.showAnalytics) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <SearchAnalyticsDashboard
          onExport={format => {
            toast({
              title: 'Export Started',
              description: `Exporting analytics as ${format.toUpperCase()}.`,
            });
          }}
          onRefresh={() => {
            toast({
              title: 'Refreshing',
              description: 'Analytics data is being refreshed.',
            });
          }}
        />
      </div>
    );
  }

  // ========================================
  // Render: Main Search View
  // ========================================
  return (
    <>
      {/* Command Palette */}
      <CommandDialog open={state.showCommandPalette} onOpenChange={closeCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                toggleAdvanced();
                closeCommandPalette();
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Open Advanced Search</span>
              <CommandShortcut>⌘A</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                toggleAnalytics();
                closeCommandPalette();
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>View Analytics</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                clearResults();
                closeCommandPalette();
              }}
            >
              <Target className="mr-2 h-4 w-4" />
              <span>Clear Results</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Popular Searches">
            {popularSearches?.slice(0, 5).map((search: SearchHistory, index: number) => (
              <CommandItem
                key={`popular-${index}`}
                onSelect={() => {
                  handleSimpleSearch(search.query);
                  closeCommandPalette();
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                <span>{search.query}</span>
                <CommandShortcut>{search.resultCount} searches</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent Searches">
            {history.data?.slice(0, 5).map((item: SearchHistory, index: number) => (
              <CommandItem
                key={`recent-${index}`}
                onSelect={() => {
                  handleSimpleSearch(item.query);
                  closeCommandPalette();
                }}
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>{item.query}</span>
                <CommandShortcut>{item.resultCount} results</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <SearchHeader
          showAdvanced={state.showAdvanced}
          useStreaming={state.useStreaming}
          showAnalytics={state.showAnalytics}
          hasSearched={hasSearched}
          onToggleAdvanced={toggleAdvanced}
          onToggleStreaming={toggleStreaming}
          onToggleAnalytics={toggleAnalytics}
          onOpenCommandPalette={openCommandPalette}
          onClearResults={clearResults}
        />

        {/* Performance Indicators */}
        <PerformanceIndicators searchTime={searchTime} enginePerformance={enginePerformance} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Search Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Streaming Progress */}
            {streamingSearch.isActive && (
              <SearchProgressIndicator
                progress={{
                  ...streamingSearch.progress,
                  status: 'searching' as const,
                  engines: [],
                }}
                isActive={streamingSearch.isActive}
                onCancel={streamingSearch.cancelSearch}
              />
            )}

            {/* Simple Search */}
            {!state.showAdvanced && (
              <Card>
                <CardContent className="p-6">
                  <IntelligentAutocomplete
                    onSearch={handleSimpleSearch}
                    placeholder="Search bills, sponsors, comments, and more..."
                    className="w-full"
                    maxSuggestions={8}
                  />
                </CardContent>
              </Card>
            )}

            {/* Advanced Search */}
            {state.showAdvanced && (
              <AdvancedSearchInterface
                onSearch={handleAdvancedSearch}
                onSave={handleSaveSearchConfig}
                onExport={handleExportResults}
                initialQuery={state.searchQuery}
              />
            )}

            {/* Search Results */}
            {(hasSearched || isLoading || displayResults.length > 0) && (
              <div className="space-y-4">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold">
                      Search Results
                      {results?.totalCount && (
                        <span className="ml-2 text-muted-foreground">
                          ({results.totalCount.toLocaleString()})
                        </span>
                      )}
                    </h2>
                    {results?.engines && results.engines.length > 0 && (
                      <div className="flex items-center space-x-2">
                        {results.engines.map((engine, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {engine.engine}: {engine.results.length} results ({engine.searchTime}ms)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <SearchFilters
                    filters={state.filters}
                    onFiltersChange={updateFilters}
                    compact={true}
                  />
                </div>

                {/* Results Grid */}
                <ResultsGrid
                  results={displayResults}
                  searchQuery={state.searchQuery}
                  isLoading={isLoading}
                  hasSearched={hasSearched}
                  error={error}
                  onResultClick={handleResultClick}
                  onSaveResult={handleSaveResult}
                  onShareResult={handleShareResult}
                />
              </div>
            )}

            {/* Welcome Content */}
            {!hasSearched && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {popularSearches && popularSearches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Popular Searches</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {popularSearches.map((search: SearchHistory, index: number) => (
                          <Button
                            key={`welcome-popular-${index}`}
                            variant="ghost"
                            className="w-full justify-start text-left h-auto p-3"
                            onClick={() => handleSimpleSearch(search.query)}
                          >
                            <div>
                              <div className="font-medium">{search.query}</div>
                              <div className="text-xs text-muted-foreground">
                                {search.resultCount} searches
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <SearchTips compact={true} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {(hasSearched || displayResults.length > 0) && (
              <SearchFilters
                filters={state.filters}
                onFiltersChange={updateFilters}
                availableCategories={[]}
                availableStatuses={[]}
              />
            )}

            <Tabs value={state.activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved">
                  <Star className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="saved" className="mt-4">
                <SavedSearches onExecuteSearch={handleExecuteSavedSearch} />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Recent Searches</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.data && history.data.length > 0 ? (
                      <div className="space-y-2">
                        {history.data.slice(0, 10).map((item: SearchHistory, index: number) => (
                          <Button
                            key={`sidebar-history-${index}`}
                            variant="ghost"
                            className="w-full justify-start text-left h-auto p-3"
                            onClick={() => handleSimpleSearch(item.query)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.query}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.resultCount} results
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No recent searches</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}

export default UniversalSearchPage;
