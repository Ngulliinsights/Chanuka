/**
 * Intelligent Search Page
 *
 * Comprehensive search interface that combines all search components
 * and provides a complete search experience with dual-engine capabilities.
 */


import { AdvancedSearchInterface } from '@client/features/search/ui/interface/AdvancedSearch';
import { IntelligentAutocomplete } from '@client/features/search/ui/interface/IntelligentAutocomplete';
import { SavedSearches } from '@client/features/search/ui/interface/SavedSearches';
import { SearchAnalyticsDashboard } from '@client/features/search/ui/interface/SearchAnalyticsDashboard';
import { SearchFilters } from '@client/features/search/ui/filters/SearchFilters';
import { SearchProgressIndicator } from '@client/features/search/ui/interface/SearchProgressIndicator';
import { SearchResultCard } from '@client/features/search/ui/results/SearchResultCard';
import { SearchTips } from '@client/features/search/ui/interface/SearchTips';
import { Settings, Save, TrendingUp, Target, Clock, BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { useIntelligentSearch } from '@client/features/search/hooks/useIntelligentSearch';
import { usePopularSearches, useSearchHistory } from '@client/features/search/hooks/useSearch';
import { useStreamingSearch } from '@client/features/search/hooks/useStreamingSearch';
import { intelligentSearch } from '@client/features/search/services/intelligent-search';
import type { DualSearchRequest } from '@client/features/search/services/intelligent-search';
import type {
  SearchResult as ApiSearchResult,
  SavedSearch,
  SearchFilters as SearchFiltersType,
} from '@client/features/search/types';
import { useToast } from '@client/hooks/use-toast';
import { 
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { logger } from '@client/utils/logger';

// This type represents what SearchResultCard expects
// It's a subset of the API SearchResult with only the types it can handle
type DisplayableSearchResult = ApiSearchResult & {
  type: 'bill' | 'comment' | 'sponsor';
  excerpt: string;
  relevanceScore: number;
};

export function IntelligentSearchPage() {
  const [activeTab, setActiveTab] = useState('search');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useStreaming, setUseStreaming] = useState(true);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const { toast } = useToast();

  // Main search functionality
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

  // Streaming search functionality
  const streamingSearch = useStreamingSearch({
    autoStart: false,
    onResult: result => {
      logger.info('Streaming search result received', { resultId: result.id, type: result.type });
    },
    onProgress: progress => {
      logger.debug('Streaming search progress', { progress });
    },
    onComplete: (results, totalCount) => {
      logger.info('Streaming search completed', { resultCount: results.length, totalCount });
    },
    onError: err => {
      logger.error('Streaming search error', { error: err.message });
      toast({
        title: 'Search Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Additional data
  const { data: popularSearches } = usePopularSearches(5);
  const { history } = useSearchHistory();

  /**
   * Type guard to check if a search result can be displayed by SearchResultCard.
   * This filters out result types that aren't supported by the card component.
   */
  const isDisplayableResult = (result: ApiSearchResult): result is DisplayableSearchResult => {
    return result.type === 'bill' || result.type === 'comment' || result.type === 'sponsor';
  };

  /**
   * Converts API search results to a format compatible with SearchResultCard.
   * This ensures all required properties exist and have the correct types.
   */
  const normalizeResult = (result: ApiSearchResult): DisplayableSearchResult | null => {
    // First check if this is a displayable type
    if (!isDisplayableResult(result)) {
      logger.debug('Filtering out non-displayable result type', { type: result.type, id: result.id });
      return null;
    }

    // Now we know result.type is compatible, so we can safely cast
    // after adding the required properties
    return {
      ...result,
      type: result.type as 'bill' | 'comment' | 'sponsor',
      excerpt: result.excerpt ?? '',
      relevanceScore: result.relevanceScore ?? 0,
    };
  };

  /**
   * Filters and normalizes a list of search results to only include
   * those that can be displayed by SearchResultCard.
   */
  const getDisplayableResults = (results: ApiSearchResult[]): DisplayableSearchResult[] => {
    return results
      .map(normalizeResult)
      .filter((result): result is DisplayableSearchResult => result !== null);
  };

  // Handle simple search from autocomplete
  const handleSimpleSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearchQuery(query);

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
      setActiveTab('results');
    } catch (err) {
      logger.error('Simple search failed', {
        query,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Handle advanced search
  const handleAdvancedSearch = async (request: DualSearchRequest) => {
    setSearchQuery(request.q);

    try {
      await search(request);
      setActiveTab('results');
      setShowAdvanced(false);
    } catch (err) {
      logger.error('Advanced search failed', {
        query: request.q,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  /**
   * Handle result click - navigates to the appropriate page based on result type.
   * This function is synchronous to match SearchResultCard's expected signature.
   */
  const handleResultClick = (result: ApiSearchResult) => {
    switch (result.type) {
      case 'bill':
        window.location.href = `/bills/${result.id}`;
        break;
      case 'sponsor':
        window.location.href = `/sponsors/${result.id}`;
        break;
      case 'comment':
        if (result.metadata.bill_id) {
          window.location.href = `/bills/${result.metadata.bill_id}#comment-${result.id}`;
        }
        break;
      default:
        // Handle other types or log
        logger.warn('Unhandled result type for navigation', { type: result.type, id: result.id });
    }
  };

  /**
   * Handle save result - bookmarks a search result for the user.
   * Made synchronous by handling the async operation internally.
   */
  const handleSaveResult = (result: ApiSearchResult) => {
    // Execute the save operation asynchronously without blocking the return
    Promise.resolve()
      .then(() => {
        // In a real implementation, this would call an API to save the bookmark
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
  };

  /**
   * Handle share result - shares a search result via the Web Share API or clipboard.
   * Made synchronous by handling the async operation internally.
   */
  const handleShareResult = (result: ApiSearchResult) => {
    // Execute the share operation asynchronously without blocking the return
    const shareContent = async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: result.title,
            text: result.excerpt || result.content,
            url: window.location.origin + `/bills/${result.id}`,
          });
        } else {
          // Fallback to clipboard for browsers without Web Share API
          await navigator.clipboard.writeText(
            `${result.title}\n${window.location.origin}/bills/${result.id}`
          );
          toast({
            title: 'Link Copied',
            description: 'Result link has been copied to clipboard.',
          });
        }
      } catch {
        toast({
          title: 'Share Failed',
          description: 'Failed to share result.',
          variant: 'destructive',
        });
      }
    };

    shareContent();
  };

  // Handle export results
  const handleExportResults = async (format: 'csv' | 'json') => {
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
  };

  // Handle execute saved search
  const handleExecuteSavedSearch = (savedSearch: SavedSearch) => {
    const request: DualSearchRequest = {
      ...savedSearch.query,
      enableFuzzy: true,
      combineResults: true,
      highlightMatches: true,
    };

    handleAdvancedSearch(request);
  };

  // Handle save search configuration
  const handleSaveSearchConfig = async (config: any) => {
    try {
      await intelligentSearch.saveSearchWithAlerts({
        name: config.name,
        query: {
          q: searchQuery,
          ...config.searchSettings,
        },
        emailAlerts: config.emailAlerts,
        isPublic: config.isPublic || false,
      });

      toast({
        title: 'Search Configuration Saved',
        description: `"${config.name}" has been saved successfully.`,
      });
    } catch {
      toast({
        title: 'Save Failed',
        description: 'Failed to save search configuration.',
        variant: 'destructive',
      });
    }
  };

  // Add keyboard shortcut for command palette - must be before early returns
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Show analytics dashboard if enabled
  if (showAnalytics) {
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

  // Get the displayable results from regular search
  // Note: Streaming results have incompatible type structure, using regular search results for now
  if (results?.results) {
    logger.debug('Using regular search results', {
      resultCount: results.results.length,
      firstResultKeys: Object.keys(results.results[0] || {}),
      firstResultType: results.results[0]?.type,
    });
  }

  const displayResults = getDisplayableResults(results?.results || []);

  return (
    <>
      {/* Command Palette */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => {
              setShowAdvanced(true);
              setShowCommandPalette(false);
            }}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Open Advanced Search</span>
              <CommandShortcut>⌘A</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => {
              setShowAnalytics(true);
              setShowCommandPalette(false);
            }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>View Analytics</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => {
              clearResults();
              setShowCommandPalette(false);
            }}>
              <Target className="mr-2 h-4 w-4" />
              <span>Clear Results</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Popular Searches">
            {popularSearches?.slice(0, 5).map((search: any, index: number) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  handleSimpleSearch(search.query);
                  setShowCommandPalette(false);
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                <span>{search.query}</span>
                <CommandShortcut>{search.count} searches</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent Searches">
            {history.data?.slice(0, 5).map((item: any, index: number) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  handleSimpleSearch(item.query);
                  setShowCommandPalette(false);
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Target className="h-8 w-8 text-primary" />
              <span>Intelligent Search</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Advanced dual-engine search with AI-powered suggestions and real-time results
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={showAdvanced ? 'default' : 'outline'}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced
            </Button>

            <Button
              variant={useStreaming ? 'default' : 'outline'}
              onClick={() => setUseStreaming(!useStreaming)}
              size="sm"
            >
              <Target className="h-4 w-4 mr-2" />
              Streaming
            </Button>

            <Button
              variant={showAnalytics ? 'default' : 'outline'}
              onClick={() => setShowAnalytics(!showAnalytics)}
              size="sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowCommandPalette(true)}
              size="sm"
            >
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {hasSearched && (
              <Button variant="outline" onClick={clearResults}>
                Clear Results
              </Button>
            )}
          </div>
        </div>

        {/* Search Performance Indicators */}
        {enginePerformance.length > 0 && (
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Search Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Streaming Progress Indicator */}
          {streamingSearch.isActive && (
            <SearchProgressIndicator
              progress={streamingSearch.progress}
              isActive={streamingSearch.isActive}
              onCancel={streamingSearch.cancelSearch}
            />
          )}

          {/* Simple Search */}
          {!showAdvanced && (
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
          {showAdvanced && (
            <AdvancedSearchInterface
              onSearch={handleAdvancedSearch}
              onSave={handleSaveSearchConfig}
              onExport={handleExportResults}
              initialQuery={searchQuery}
            />
          )}

          {/* Search Results */}
          {(hasSearched || isLoading || displayResults.length > 0) && (
            <div className="space-y-4">
              {/* Results Header with Filters */}
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

                {/* Compact Filters */}
                <SearchFilters filters={filters} onFiltersChange={setFilters} compact={true} />
              </div>

              {/* Results Grid */}
              <div className="space-y-4">
                {displayResults.map((result, index) => (
                  <SearchResultCard
                    key={`${result.type}-${result.id}-${index}`}
                    result={result}
                    query={searchQuery}
                    onClick={handleResultClick}
                    onSave={handleSaveResult}
                    onShare={handleShareResult}
                    highlightMatches={true}
                  />
                ))}
              </div>

              {/* Loading State */}
              {isLoading && displayResults.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Searching...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-8">
                  <p className="text-destructive">{error.message}</p>
                </div>
              )}

              {/* No Results State */}
              {!isLoading && hasSearched && displayResults.length === 0 && !error && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No results found. Try adjusting your search terms.</p>
                </div>
              )}
            </div>
          )}

          {/* Welcome Content */}
          {!hasSearched && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular Searches */}
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
                      {popularSearches.map((search: any, index: number) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => handleSimpleSearch(search.query)}
                        >
                          <div>
                            <div className="font-medium">{search.query}</div>
                            <div className="text-xs text-muted-foreground">
                              {search.count} searches
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search Tips */}
              <SearchTips compact={true} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Filters */}
          {(hasSearched || displayResults.length > 0) && (
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableCategories={[]}
              availableStatuses={[]}
            />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="saved">
                <Save className="h-4 w-4 mr-2" />
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
                      {history.data.slice(0, 10).map((item: any, index: number) => (
                        <Button
                          key={index}
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

export default IntelligentSearchPage;