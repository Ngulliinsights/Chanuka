/**
 * Expert Insights - Displays expert contributions with verification
 * 
 * Features:
 * - Expert verification badges and credibility scoring
 * - Community validation (upvotes/downvotes)
 * - Confidence levels and methodology display
 * - Source citations and references
 * - Compact and full view modes
 */

import { formatDistanceToNow } from 'date-fns';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Share2,
  ExternalLink,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { cn } from '@client/lib/utils';
import { ExpertInsight } from '@client/types/community';
import { Avatar, AvatarFallback, AvatarImage } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';

interface ExpertInsightsProps {
  insights: ExpertInsight[];
  compact?: boolean;
  className?: string;
}

export function ExpertInsights({
  insights,
  compact = false,
  className
}: ExpertInsightsProps) {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(() => new Set());
  const [votedInsights, setVotedInsights] = useState<Map<string, 'up' | 'down'>>(() => new Map());

  // Cleanup state on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setExpandedInsights(new Set());
      setVotedInsights(new Map());
    };
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getValidationColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleExpanded = useCallback((insightId: string) => {
    setExpandedInsights(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(insightId)) {
        newExpanded.delete(insightId);
      } else {
        newExpanded.add(insightId);
      }
      return newExpanded;
    });
  }, []);

  const handleVote = useCallback((insightId: string, voteType: 'up' | 'down') => {
    setVotedInsights(prev => {
      const currentVote = prev.get(insightId);
      const newVotes = new Map(prev);

      if (currentVote === voteType) {
        // Remove vote if clicking the same vote
        newVotes.delete(insightId);
      } else {
        // Set new vote
        newVotes.set(insightId, voteType);
      }

      return newVotes;
    });

    // TODO: Send vote to API
    console.log(`Voted ${voteType} on insight ${insightId}`);
  }, []);

  const handleShare = (insight: ExpertInsight) => {
    // TODO: Implement sharing functionality
    console.log('Sharing insight:', insight.id);
  };

  if (insights.length === 0) {
    return (
      <Card className={cn('chanuka-card', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Award className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No expert insights yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => toggleExpanded(insight.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={insight.expertAvatar} alt={insight.expertName} />
                <AvatarFallback className="text-xs">
                  {getInitials(insight.expertName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{insight.expertName}</span>
                  <Badge variant="outline" className="text-xs">
                    Expert
                  </Badge>
                </div>

                <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                  {insight.title}
                </h4>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {insight.summary}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{insight.communityValidation.upvotes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{insight.comments}</span>
                  </div>
                  <div className={cn('flex items-center gap-1', getConfidenceColor(insight.confidence))}>
                    <Award className="h-3 w-3" />
                    <span>{Math.round(insight.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {insights.map((insight) => {
        const isExpanded = expandedInsights.has(insight.id);
        const userVote = votedInsights.get(insight.id);
        const shouldTruncate = insight.content.length > 300;
        const displayContent = shouldTruncate && !isExpanded 
          ? insight.content.slice(0, 300) + '...' 
          : insight.content;

        return (
          <Card key={insight.id} className="chanuka-card">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={insight.expertAvatar} alt={insight.expertName} />
                  <AvatarFallback>{getInitials(insight.expertName)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{insight.expertName}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      Expert
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {insight.specializations.slice(0, 3).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {insight.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{insight.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(insight.timestamp)}</span>
                    </div>
                    
                    <div className={cn('flex items-center gap-1', getConfidenceColor(insight.confidence))}>
                      <Award className="h-4 w-4" />
                      <span>{getConfidenceLabel(insight.confidence)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Insight Title */}
              <h3 className="text-xl font-semibold leading-tight">{insight.title}</h3>

              {/* Summary */}
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Key Insight:</p>
                <p className="text-sm text-blue-800">{insight.summary}</p>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {displayContent}
                </p>
                {shouldTruncate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(insight.id)}
                    className="text-xs p-0 h-auto mt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Read more
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Confidence and Methodology */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm mb-2">Confidence Level</h5>
                  <div className="flex items-center gap-2">
                    <Progress value={insight.confidence * 100} className="flex-1" />
                    <span className={cn('text-sm font-medium', getConfidenceColor(insight.confidence))}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-2">Community Validation</h5>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={insight.communityValidation.validationScore * 100} 
                      className="flex-1" 
                    />
                    <span className={cn(
                      'text-sm font-medium', 
                      getValidationColor(insight.communityValidation.validationScore)
                    )}>
                      {Math.round(insight.communityValidation.validationScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Methodology */}
              {insight.methodology && (
                <div>
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Methodology
                  </h5>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {insight.methodology}
                  </p>
                </div>
              )}

              {/* Sources */}
              {insight.sources && insight.sources.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Sources & References
                  </h5>
                  <div className="space-y-2">
                    {insight.sources.map((source, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate"
                        >
                          {source}
                        </a>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Areas */}
              {insight.policyAreas.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Policy Areas</h5>
                  <div className="flex flex-wrap gap-2">
                    {insight.policyAreas.map((area) => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Bill */}
              {insight.billTitle && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Related Bill</p>
                      <p className="text-sm text-muted-foreground">{insight.billTitle}</p>
                    </div>
                    {insight.billId && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/bills/${insight.billId}`}>
                          View Bill
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Engagement Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-4">
                  {/* Upvote */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(insight.id, 'up')}
                    className={cn(
                      'flex items-center gap-2',
                      userVote === 'up' && 'text-green-600 bg-green-50'
                    )}
                  >
                    <ThumbsUp className={cn(
                      'h-4 w-4',
                      userVote === 'up' && 'fill-current'
                    )} />
                    <span>{insight.communityValidation.upvotes}</span>
                  </Button>

                  {/* Downvote */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(insight.id, 'down')}
                    className={cn(
                      'flex items-center gap-2',
                      userVote === 'down' && 'text-red-600 bg-red-50'
                    )}
                  >
                    <ThumbsDown className={cn(
                      'h-4 w-4',
                      userVote === 'down' && 'fill-current'
                    )} />
                    <span>{insight.communityValidation.downvotes}</span>
                  </Button>

                  {/* Comments */}
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{insight.comments}</span>
                  </Button>

                  {/* Share */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(insight)}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{insight.shares}</span>
                  </Button>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  Updated {formatTimeAgo(insight.lastUpdated)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}