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
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { SearchResult, SearchResponse } from '../types';
import type { CombinedSearchResult } from '../services/intelligent-search';

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

  // Sort and filter results
  const processedResults = useMemo(() => {
    if (!results?.results) return [];

    let filtered = results.results;

    // Filter by type if selected
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(result => selectedTypes.includes(result.type));
    }

    // Sort results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          const dateA = new Date(a.metadata.created_at || 0).getTime();
          const dateB = new Date(b.metadata.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'engagement':
          const engagementA = (a.metadata.view_count || 0) + (a.metadata.comment_count || 0);
          const engagementB = (b.metadata.view_count || 0) + (b.metadata.comment_count || 0);
          comparison = engagementA - engagementB;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [results, sortBy, sortOrder, selectedTypes]);

  // Get available result types for filtering
  const availableTypes = useMemo(() => {
    if (!results?.results) return [];
    
    const types = new Set(results.results.map(r => r.type));
    return Array.from(types).map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count: results.results.filter(r => r.type === type).length
    }));
  }, [results]);

  // Highlight search terms in text
  const highlightText = (text: string, highlights: string[] = []): React.ReactNode => {
    if (!highlights.length) return text;

    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // Get relevance score color
  const getRelevanceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get result type icon
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

  // Render loading skeleton
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

  // Render single result
  const renderResult = (result: SearchResult, index: number) => (
    <Card
      key={`${result.type}-${result.id}`}
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onResultClick?.(result)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with type, relevance, and actions */}
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

          {/* Title */}
          <h3 className="font-semibold text-lg leading-tight">
            {highlightText(result.title, result.highlights)}
          </h3>

          {/* Content/Excerpt */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {highlightText(result.excerpt || result.content, result.highlights)}
          </p>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {result.metadata.created_at && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(result.metadata.created_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {result.metadata.view_count && (
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{result.metadata.view_count.toLocaleString()} views</span>
              </div>
            )}
            
            {result.metadata.comment_count && (
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

          {/* Tags */}
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

          {/* Relevance Progress Bar */}
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

  if (isLoading) {
    return (
      <div className={className}>
        {renderSkeleton()}
      </div>
    );
  }

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
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">
            {results.totalCount.toLocaleString()} results
          </h2>
          <Badge variant="outline" className="text-xs">
            {results.searchTime}ms
          </Badge>
          
          {/* Engine Performance */}
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

        <div className="flex items-center space-x-2">
          {/* Type Filter */}
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

          {/* Sort Options */}
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>

          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          {/* Export */}
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

      {/* Search Suggestions */}
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

      {/* Results List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {processedResults.map((result, index) => renderResult(result, index))}
      </div>

      {/* Load More / Pagination could go here */}
    </div>
  );
}

export default SearchResults;