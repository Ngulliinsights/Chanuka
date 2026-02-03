/**
 * SearchResultCard Component
 *
 * Enhanced search result card with highlighting, snippets, and interactive features
 * for displaying individual search results with rich metadata and actions.
 */

import {
  Save,
  Share2,
  ExternalLink,
  Clock,
  User,
  MessageSquare,
  TrendingUp,
  Eye,
  Star,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@client/lib/design-system';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import { cn } from '@client/lib/design-system';
import { useToast } from '@client/lib/hooks/use-toast.ts';
import type { SearchResult, SearchHighlight } from '@client/lib/types';

interface SearchResultCardProps {
  result: SearchResult;
  query?: string;
  onClick?: (result: SearchResult) => void;
  onSave?: (result: SearchResult) => void;
  onShare?: (result: SearchResult) => void;
  onBookmark?: (result: SearchResult) => void;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
  highlightMatches?: boolean;
}

export function SearchResultCard({
  result,
  query = '',
  onClick,
  onSave,
  onShare,
  onBookmark,
  className = '',
  compact = false,
  showActions = true,
  highlightMatches = true,
}: SearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    onClick?.(result);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onSave?.(result);
      toast({
        title: 'Result Saved',
        description: `"${result.title}" has been saved.`,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save result.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({
          title: result.title,
          text: result.description || result.content,
          url: window.location.origin + getResultUrl(),
        });
      } else {
        await navigator.clipboard.writeText(
          `${result.title}\n${window.location.origin}${getResultUrl()}`
        );
        toast({
          title: 'Link Copied',
          description: 'Result link copied to clipboard.',
        });
      }
      onShare?.(result);
    } catch (error) {
      toast({
        title: 'Share Failed',
        description: 'Failed to share result.',
        variant: 'destructive',
      });
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    onBookmark?.(result);
    toast({
      title: isBookmarked ? 'Bookmark Removed' : 'Bookmarked',
      description: isBookmarked
        ? `"${result.title}" removed from bookmarks.`
        : `"${result.title}" added to bookmarks.`,
    });
  };

  const getResultUrl = () => {
    switch (result.type) {
      case 'bill':
        return `/bills/${result.id}`;
      case 'sponsor':
        return `/sponsors/${result.id}`;
      case 'comment':
        return result.metadata?.bill_id
          ? `/bills/${result.metadata.bill_id}#comment-${result.id}`
          : '#';
      default:
        return '#';
    }
  };

  const getTypeIcon = () => {
    switch (result.type) {
      case 'bill':
        return <ExternalLink className="h-4 w-4" />;
      case 'sponsor':
        return <User className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (result.type) {
      case 'bill':
        return 'bg-blue-100 text-blue-800';
      case 'sponsor':
        return 'bg-green-100 text-green-800';
      case 'comment':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const highlightText = (text: string, highlights: SearchHighlight[] = []): React.ReactNode => {
    if (!highlightMatches || !highlights.length) {
      return text;
    }

    // Simple highlighting - in a real implementation, you'd use the highlight positions
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    if (!queryWords.length) {
      return text;
    }

    const regex = new RegExp(`(${queryWords.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = queryWords.some(word => part.toLowerCase().includes(word.toLowerCase()));
      return isMatch ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      );
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <Card
        className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">{getTypeIcon()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-sm truncate">{result.title}</h3>
                <Badge variant="outline" className={cn('text-xs', getTypeColor())}>
                  {result.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {highlightText(result.description || result.content || '')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span
                  className={cn('text-xs font-medium', getRelevanceColor(result.relevanceScore))}
                >
                  {result.relevanceScore}% match
                </span>
                {result.metadata?.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(result.metadata.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card
        className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
        onClick={handleClick}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-1">{getTypeIcon()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg truncate">{result.title}</h3>
                    <Badge className={getTypeColor()}>{result.type}</Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getRelevanceColor(result.relevanceScore))}
                    >
                      {result.relevanceScore}% match
                    </Badge>
                  </div>

                  {/* Content Preview */}
                  <div className="space-y-2">
                    <p className="text-muted-foreground line-clamp-3">
                      {highlightText(result.description || result.content || '')}
                    </p>

                    {/* Expandable content */}
                    {result.content && result.content.length > 200 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          {isExpanded ? (
                            <>
                              Show less <ChevronUp className="h-3 w-3 ml-1" />
                            </>
                          ) : (
                            <>
                              Show more <ChevronDown className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                        {isExpanded && (
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <p className="text-sm">{highlightText(result.content)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBookmark}
                        className="h-8 w-8 p-0"
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            isBookmarked && 'fill-yellow-400 text-yellow-400'
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isBookmarked ? 'Remove bookmark' : 'Bookmark'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShare}
                        className="h-8 w-8 p-0"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        className="h-8 w-8 p-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                {result.metadata?.created_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(result.metadata.created_at)}</span>
                  </div>
                )}

                {result.metadata?.authorName && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{result.metadata.authorName}</span>
                  </div>
                )}

                {result.metadata?.view_count && (
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{result.metadata.view_count} views</span>
                  </div>
                )}

                {result.metadata?.comment_count && (
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{result.metadata.comment_count} comments</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {result.metadata?.status && (
                  <Badge variant="outline" className="text-xs">
                    {result.metadata.status}
                  </Badge>
                )}
                {result.metadata?.category && (
                  <Badge variant="outline" className="text-xs">
                    {result.metadata.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default SearchResultCard;
