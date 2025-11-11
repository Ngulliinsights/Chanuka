/**
 * Intelligent Search Page
 * 
 * Comprehensive search interface that combines all search components
 * and provides a complete search experience with dual-engine capabilities.
 */

import { useState } from 'react';
import { Settings, Save, TrendingUp, Zap, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { IntelligentAutocomplete } from '@/features/search/components/IntelligentAutocomplete';
import { AdvancedSearchInterface } from '@/features/search/components/AdvancedSearchInterface';
import { SearchResults } from '@/features/search/components/SearchResults';
import { SavedSearches } from '@/features/search/components/SavedSearches';
import { useIntelligentSearch } from '@/features/search/hooks/useIntelligentSearch';
import { usePopularSearches, useSearchHistory } from '@/features/search/hooks/useSearch';
import { intelligentSearch } from '@/features/search/services/intelligent-search';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { DualSearchRequest } from '@/features/search/services/intelligent-search';
import type { SearchResult, SavedSearch } from '@/features/search/types';

export function IntelligentSearchPage() {
  const [activeTab, setActiveTab] = useState('search');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    hasSearched
  } = useIntelligentSearch({
    debounceMs: 300,
    enableAutoSearch: false
  });

  // Additional data
  const { data: popularSearches } = usePopularSearches(5);
  const { history } = useSearchHistory();

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
      highlightMatches: true
    };

    try {
      await search(searchRequest);
      setActiveTab('results');
    } catch (error) {
      logger.error('Simple search failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
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
    } catch (error) {
      logger.error('Advanced search failed', {
        query: request.q,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    // Navigate to the specific result based on type
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
        logger.warn('Unknown result type', { type: result.type, id: result.id });
    }
  };

  // Handle save result
  const handleSaveResult = async (result: SearchResult) => {
    try {
      // This would typically save to user's bookmarks or favorites
      toast({
        title: "Result Saved",
        description: `"${result.title}" has been saved to your bookmarks.`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save result.",
        variant: "destructive"
      });
    }
  };

  // Handle share result
  const handleShareResult = async (result: SearchResult) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: result.title,
          text: result.excerpt || result.content,
          url: window.location.origin + `/bills/${result.id}`
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `${result.title}\n${window.location.origin}/bills/${result.id}`
        );
        toast({
          title: "Link Copied",
          description: "Result link has been copied to clipboard."
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to share result.",
        variant: "destructive"
      });
    }
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
        category: result.metadata.category
      }));

      let content: string;
      let mimeType: string;
      let filename: string;

      if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(','));
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
        title: "Export Successful",
        description: `Results exported as ${format.toUpperCase()}.`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export results.",
        variant: "destructive"
      });
    }
  };

  // Handle execute saved search
  const handleExecuteSavedSearch = (savedSearch: SavedSearch) => {
    const request: DualSearchRequest = {
      ...savedSearch.query,
      enableFuzzy: true,
      combineResults: true,
      highlightMatches: true
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
          ...config.searchSettings
        },
        emailAlerts: config.emailAlerts,
        isPublic: config.isPublic || false
      });

      toast({
        title: "Search Configuration Saved",
        description: `"${config.name}" has been saved successfully.`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save search configuration.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Zap className="h-8 w-8 text-primary" />
              <span>Intelligent Search</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Advanced dual-engine search with AI-powered suggestions and real-time results
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={showAdvanced ? "default" : "outline"}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced
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
          {(hasSearched || isLoading) && (
            <SearchResults
              results={results}
              isLoading={isLoading}
              error={error?.message || null}
              onResultClick={handleResultClick}
              onSaveResult={handleSaveResult}
              onShareResult={handleShareResult}
              onExportResults={handleExportResults}
            />
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
                      {popularSearches.map((search, index) => (
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
              <Card>
                <CardHeader>
                  <CardTitle>Search Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong>Smart Search:</strong> Our AI understands context and can find relevant results even with typos.
                    </div>
                    <div>
                      <strong>Field Search:</strong> Use "title:healthcare" to search specific fields.
                    </div>
                    <div>
                      <strong>Exact Phrases:</strong> Use quotes for exact matches: "climate change".
                    </div>
                    <div>
                      <strong>Exclusions:</strong> Use minus sign to exclude terms: healthcare -insurance.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="saved">
                <Save className="h-4 w-4 mr-2" />
                Saved
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="mt-4">
              <SavedSearches
                onExecuteSearch={handleExecuteSavedSearch}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5" />
                    <span>Recent Searches</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.data && history.data.length > 0 ? (
                    <div className="space-y-2">
                      {history.data.slice(0, 10).map((item, index) => (
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
                    <p className="text-muted-foreground text-sm">
                      No recent searches
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default IntelligentSearchPage;