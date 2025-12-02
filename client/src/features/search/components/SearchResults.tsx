/**
 * Search Results Component
 * 
 * Displays search results with highlighting, relevance scoring,
 * and advanced result management features.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Clock,
  Eye,
  MessageSquare,
  Share2,
  Bookmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  LayoutList,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { SearchResult } from '../types';
import type { CombinedSearchResult } from '../services/intelligent-search';

// Type definition for search highlights
interface SearchHighlight {
  field: string;
  text: string;
  score?: number;
}

interface SearchResultsProps {
  results: CombinedSearchResult | null;
  isLoading?: boolean;
  error?: string | null;
  onResultClick?: (result: SearchResult) => void;
  onSaveResult?: (result: SearchResult) => void;
  onShareResult?: (result: SearchResult) => void;
  onExportResults?: (format: 'csv' | 'json') => void;
  className?: string;
}

type SortOption = 'relevance' | 'date' | 'title' | 'engagement';
type ViewMode = 'list' | 'grid';

export function SearchResults({
  results,
  isLoading = false,
  error = null,
  onResultClick,
  onSaveResult,
  onShareResult,
  onExportResults,
  className = ''
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Sort and filter results based on user preferences
  const processedResults = useMemo(() => {
    if (!results?.results) return [];

    let filtered = results.results;

    // Apply type filtering if any types are selected
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(result => selectedTypes.includes(result.type));
    }

    // Sort the filtered results according to the selected criteria
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          // Higher relevance scores should appear first
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          // Compare timestamps to sort by date
          const dateA = new Date(a.metadata.created_at || 0).getTime();
          const dateB = new Date(b.metadata.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'title':
          // Alphabetical sorting by title
          comparison = a.title.localeCompare(b.title);
          break;
        case 'engagement':
          // Calculate total engagement as views plus comments
          const engagementA = (a.metadata.view_count || 0) + (a.metadata.comment_count || 0);
          const engagementB = (b.metadata.view_count || 0) + (b.metadata.comment_count || 0);
          comparison = engagementA - engagementB;
          break;
      }

      // Reverse comparison for descending order
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [results, sortBy, sortOrder, selectedTypes]);

  // Extract unique result types and count occurrences for the filter dropdown
  const availableTypes = useMemo(() => {
    if (!results?.results) return [];
    
    const types = new Set(results.results.map(r => r.type));
    return Array.from(types).map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count: results.results.filter(r => r.type === type).length
    }));
  }, [results]);

  // Helper function to extract highlight terms from SearchHighlight objects
  const extractHighlightTerms = (highlights: SearchHighlight[] | string[]): string[] => {
    if (!highlights || highlights.length === 0) return [];
    
    // Check if highlights are objects or strings
    if (typeof highlights[0] === 'string') {
      return highlights as string[];
    }
    
    // Extract text from SearchHighlight objects
    return (highlights as SearchHighlight[]).map(h => h.text);
  };

  // Highlight matching search terms within text content
  const highlightText = (text: string, highlights: SearchHighlight[] | string[] = []): React.ReactNode => {
    const terms = extractHighlightTerms(highlights);
    
    if (!terms.length) return text;

    let highlightedText = text;
    
    // Replace each search term with a marked version for visual emphasis
    terms.forEach(highlight => {
      // Escape special regex characters to handle terms like "C++" safely
      const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-0.5">$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // Determine the color coding for relevance scores
  const getRelevanceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Map result types to appropriate emoji icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bill':
        return '📄';
      case 'sponsor':
        return '👤';
      case 'comment':
        return '💬';
      default:
        return '📋';
    }
  };

  // Render skeleton loaders while data is being fetched
  const renderSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render an individual search result card
  const renderResult = (result: SearchResult) => (
    <Card
      key={`${result.type}-${result.id}`}
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onResultClick?.(result)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header row with type badge, relevance score, and action menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getTypeIcon(result.type)}</span>
              <Badge variant="outline" className="text-xs">
                {result.type}
              </Badge>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className={`text-xs font-medium ${getRelevanceColor(result.relevanceScore)}`}>
                  {Math.round(result.relevanceScore)}%
                </span>
              </div>
            </div>

            {/* Dropdown menu for save and share actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSaveResult && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onSaveResult(result);
                  }}>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save
                  </DropdownMenuItem>
                )}
                {onShareResult && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onShareResult(result);
                  }}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Result title with search term highlighting */}
          <h3 className="font-semibold text-lg leading-tight">
            {highlightText(result.title, result.highlights)}
          </h3>

          {/* Content excerpt with search term highlighting */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {highlightText(result.excerpt || result.content, result.highlights)}
          </p>

          {/* Metadata row showing date, views, comments, and status */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {result.metadata.created_at && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(result.metadata.created_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {result.metadata.view_count !== undefined && (
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{result.metadata.view_count.toLocaleString()} views</span>
              </div>
            )}
            
            {result.metadata.comment_count !== undefined && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{result.metadata.comment_count} comments</span>
              </div>
            )}

            {result.metadata.status && (
              <Badge variant="secondary" className="text-xs">
                {result.metadata.status}
              </Badge>
            )}
          </div>

          {/* Tag badges if available */}
          {result.metadata.tags && result.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.metadata.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                <Badge key={tagIndex} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {result.metadata.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{result.metadata.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Visual relevance score indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Relevance</span>
              <span className={getRelevanceColor(result.relevanceScore)}>
                {Math.round(result.relevanceScore)}%
              </span>
            </div>
            <Progress value={result.relevanceScore} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show loading state with skeleton placeholders
  if (isLoading) {
    return (
      <div className={className}>
        {renderSkeleton()}
      </div>
    );
  }

  // Show error message if search failed
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-destructive mb-2">Search Error</div>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state when no results are found
  if (!results || processedResults.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Results header with count, timing, and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">
            {results.totalCount.toLocaleString()} results
          </h2>
          <Badge variant="outline" className="text-xs">
            {results.searchTime}ms
          </Badge>
          
          {/* Show search engine performance metrics if multiple engines were used */}
          {results.engines.length > 1 && (
            <div className="flex items-center space-x-2">
              {results.engines.map(engine => (
                <Badge key={engine.engine} variant="secondary" className="text-xs">
                  {engine.engine}: {engine.results.length}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Control panel for filtering, sorting, and viewing options */}
        <div className="flex items-center space-x-2">
          {/* Type filter dropdown - only shown when multiple types exist */}
          {availableTypes.length > 1 && (
            <Select
              value={selectedTypes.join(',')}
              onValueChange={(value) => setSelectedTypes(value ? value.split(',') : [])}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} ({type.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort criteria selector */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort direction toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>

          {/* View mode toggle between list and grid layouts */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Export functionality dropdown */}
          {onExportResults && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExportResults('json')}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportResults('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Search suggestions section - helps users refine their search */}
      {results.suggestions.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Related searches:</span>
              {results.suggestions.map((suggestion, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer hover:bg-accent">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results display area - adapts layout based on view mode */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {processedResults.map((result) => renderResult(result))}
      </div>
    </div>
  );
}

export default SearchResults;