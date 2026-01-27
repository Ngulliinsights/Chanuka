/**
 * Search Results Component
 *
 * Displays search results with highlighting, relevance scoring,
 * and advanced result management features.
 */

import {
  Search,
  Star,
  Clock,
  Eye,
  MessageSquare,
  Share2,
  Bookmark,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Download,
  MoreHorizontal,
} from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/lib/design-system';
import { Skeleton } from '@client/lib/design-system';

// Type definitions for better type safety throughout the component
interface SearchHighlight {
  field: string;
  text: string;
  score?: number;
}

interface SearchMetadata {
  created_at?: string;
  view_count?: number;
  comment_count?: number;
  status?: string;
  tags?: string[] | string[];
  [key: string]: unknown;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  excerpt?: string;
  relevanceScore: number;
  highlights?: SearchHighlight[] | string[];
  metadata: SearchMetadata;
}

interface SearchEngine {
  engine: string;
  results: SearchResult[];
}

interface CombinedSearchResult {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
  engines: SearchEngine[];
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

// Helper function to format dates in a readable format without external libraries
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export function SearchResults({
  results,
  isLoading = false,
  error = null,
  onResultClick,
  onSaveResult,
  onShareResult,
  onExportResults,
  className = '',
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Sort and filter results based on user preferences
  // Using useMemo ensures this expensive computation only runs when dependencies change
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
        case 'relevance': {
          // Higher relevance scores should appear first, so we compare normally
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        }
        case 'date': {
          // Compare timestamps to sort by date, handling missing dates gracefully
          const dateA = a.metadata.created_at ? new Date(a.metadata.created_at).getTime() : 0;
          const dateB = b.metadata.created_at ? new Date(b.metadata.created_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'title': {
          // Alphabetical sorting by title with case-insensitive comparison
          comparison = a.title.localeCompare(b.title);
          break;
        }
        case 'engagement': {
          // Calculate total engagement as views plus comments
          const engagementA = (a.metadata.view_count || 0) + (a.metadata.comment_count || 0);
          const engagementB = (b.metadata.view_count || 0) + (b.metadata.comment_count || 0);
          comparison = engagementA - engagementB;
          break;
        }
      }

      // Reverse comparison for descending order
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [results, sortBy, sortOrder, selectedTypes]);

  // Extract unique result types and count occurrences for the filter dropdown
  // This helps users understand the distribution of results across different types
  const availableTypes = useMemo(() => {
    if (!results?.results) return [];

    const typeCounts = new Map<string, number>();

    // Count occurrences of each type
    results.results.forEach(result => {
      typeCounts.set(result.type, (typeCounts.get(result.type) || 0) + 1);
    });

    // Convert to array format for rendering
    return Array.from(typeCounts.entries()).map(([type, count]) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }));
  }, [results]);

  // Helper function to extract highlight terms from SearchHighlight objects
  // This handles both string arrays and object arrays for flexibility
  const extractHighlightTerms = useCallback(
    (highlights: SearchHighlight[] | string[] | undefined): string[] => {
      if (!highlights || highlights.length === 0) return [];

      // Check if highlights are objects or strings
      if (typeof highlights[0] === 'string') {
        return highlights as string[];
      }

      // Extract text from SearchHighlight objects
      return (highlights as SearchHighlight[]).map(h => h.text);
    },
    []
  );

  // Highlight matching search terms within text content
  // This creates a visual emphasis on the parts of the text that matched the search query
  // We use React elements instead of dangerouslySetInnerHTML for better security
  const highlightText = useCallback(
    (text: string, highlights?: SearchHighlight[] | string[]): React.ReactNode => {
      const terms = extractHighlightTerms(highlights);

      if (!terms.length) return text;

      // We escape special regex characters to safely handle terms like "C++" or "$100"
      const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);

      // Reconstruct the text with highlighted portions wrapped in mark elements
      return (
        <>
          {parts.map((part, index) => {
            const isHighlight = terms.some(term => part.toLowerCase().includes(term.toLowerCase()));
            return isHighlight ? (
              <mark key={index} className="bg-yellow-200 px-0.5 rounded">
                {part}
              </mark>
            ) : (
              <span key={index}>{part}</span>
            );
          })}
        </>
      );
    },
    [extractHighlightTerms]
  );

  // Determine the color coding for relevance scores
  // This provides quick visual feedback on result quality
  const getRelevanceColor = useCallback((score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  // Map result types to appropriate emoji icons for visual categorization
  const getTypeIcon = useCallback((type: string): string => {
    const iconMap: Record<string, string> = {
      bill: '📄',
      sponsor: '👤',
      comment: '💬',
      article: '📰',
      document: '📋',
      video: '🎥',
      image: '🖼️',
    };
    return iconMap[type] || '📋';
  }, []);

  // Handle type filter changes with proper state management
  const handleTypeFilterChange = useCallback((value: string) => {
    if (!value || value === 'all') {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([value]);
    }
  }, []);

  // Toggle sort order between ascending and descending
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Render skeleton loaders while data is being fetched
  // This improves perceived performance by showing placeholder content
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

  // Render an individual search result card with all its metadata and actions
  const renderResult = useCallback(
    (result: SearchResult) => (
      <Card
        key={`${result.type}-${result.id}`}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onResultClick?.(result)}
        role="article"
        aria-label={`Search result: ${result.title}`}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header row with type badge, relevance score, and action menu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg" role="img" aria-label={`${result.type} type`}>
                  {getTypeIcon(result.type)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {result.type}
                </Badge>
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500" aria-hidden="true" />
                  <span
                    className={`text-xs font-medium ${getRelevanceColor(result.relevanceScore)}`}
                    aria-label={`Relevance score: ${Math.round(result.relevanceScore)} percent`}
                  >
                    {Math.round(result.relevanceScore)}%
                  </span>
                </div>
              </div>

              {/* Dropdown menu for save and share actions */}
              {(onSaveResult || onShareResult) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => e.stopPropagation()}
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onSaveResult && (
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          onSaveResult(result);
                        }}
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save
                      </DropdownMenuItem>
                    )}
                    {onShareResult && (
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          onShareResult(result);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground">
              {result.metadata.created_at && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>{formatDate(result.metadata.created_at)}</span>
                </div>
              )}

              {result.metadata.view_count !== undefined && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  <span>{result.metadata.view_count.toLocaleString()} views</span>
                </div>
              )}

              {result.metadata.comment_count !== undefined && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />
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
              <Progress
                value={result.relevanceScore}
                className="h-1"
                aria-label={`Relevance: ${Math.round(result.relevanceScore)}%`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [onResultClick, onSaveResult, onShareResult, getTypeIcon, getRelevanceColor, highlightText]
  );

  // Show loading state with skeleton placeholders
  if (isLoading) {
    return <div className={className}>{renderSkeleton()}</div>;
  }

  // Show error message if search failed
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-destructive mb-2 font-semibold">Search Error</div>
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
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center flex-wrap gap-4">
          <h2 className="text-lg font-semibold">{results.totalCount.toLocaleString()} results</h2>
          <Badge variant="outline" className="text-xs">
            {results.searchTime}ms
          </Badge>

          {/* Show search engine performance metrics if multiple engines were used */}
          {results.engines.length > 1 && (
            <div className="flex items-center flex-wrap gap-2">
              {results.engines.map(engine => (
                <Badge key={engine.engine} variant="secondary" className="text-xs">
                  {engine.engine}: {engine.results.length}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Control panel for filtering, sorting, and viewing options */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Type filter dropdown - only shown when multiple types exist */}
          {availableTypes.length > 1 && (
            <Select
              value={selectedTypes[0] || 'all'}
              onChange={e => handleTypeFilterChange(e.target.value)}
              className="w-32"
            >
              <SelectItem value="all">All Types</SelectItem>
              {availableTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label} ({type.count})
                </SelectItem>
              ))}
            </Select>
          )}

          {/* Sort criteria selector */}
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="w-32"
          >
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
          </Select>

          {/* Sort direction toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
            aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sortOrder === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* View mode toggle between list and grid layouts */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
              aria-label="Grid view"
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
            <div className="flex items-start space-x-2 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">Related searches:</span>
              <div className="flex flex-wrap gap-2">
                {results.suggestions.map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    role="button"
                    tabIndex={0}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results display area - adapts layout based on view mode */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {processedResults.map(result => renderResult(result))}
      </div>
    </div>
  );
}

export default SearchResults;
