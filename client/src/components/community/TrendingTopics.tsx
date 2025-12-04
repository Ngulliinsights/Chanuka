/**
 * Trending Topics - Displays trending topics with velocity-based algorithm
 * 
 * Features:
 * - Velocity, diversity, and substance-based trending algorithm
 * - Real-time trending score updates
 * - Geographic distribution visualization
 * - Policy area categorization
 * - Compact and full view modes
 */

import { formatDistanceToNow } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  MapPin,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Zap,
  Activity
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { cn } from '@client/lib/utils';
import { TrendingTopic } from '@client/types/community';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';



interface TrendingTopicsProps {
  topics: TrendingTopic[];
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function TrendingTopics({
  topics,
  compact = false,
  showDetails = false,
  className
}: TrendingTopicsProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Memoize utility functions to prevent unnecessary recalculations
  const getTrendingIcon = useCallback((score: number) => {
    if (score > 0.8) return Zap;
    if (score > 0.6) return TrendingUp;
    if (score > 0.4) return Activity;
    return TrendingDown;
  }, []);

  const getTrendingColor = useCallback((score: number) => {
    if (score > 0.8) return 'text-red-500';
    if (score > 0.6) return 'text-orange-500';
    if (score > 0.4) return 'text-yellow-500';
    return 'text-gray-500';
  }, []);

  const getCategoryColor = useCallback((category: TrendingTopic['category']) => {
    switch (category) {
      case 'bill':
        return 'bg-blue-100 text-blue-800';
      case 'policy_area':
        return 'bg-green-100 text-green-800';
      case 'campaign':
        return 'bg-purple-100 text-purple-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const formatTimeAgo = useCallback((timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  }, []);

  const calculateVelocityTrend = useCallback((hourlyActivity: number[]) => {
    if (hourlyActivity.length < 2) return 0;
    const recent = hourlyActivity.slice(-3).reduce((sum, val) => sum + val, 0);
    const previous = hourlyActivity.slice(-6, -3).reduce((sum, val) => sum + val, 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  }, []);

  const toggleExpanded = useCallback((topicId: string) => {
    setExpandedTopic(prev => prev === topicId ? null : topicId);
  }, []);

  if (topics.length === 0) {
    return (
      <Card className={cn('chanuka-card', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No trending topics yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {topics.map((topic, index) => {
          const TrendingIcon = getTrendingIcon(topic.trendingScore);
          const velocityTrend = calculateVelocityTrend(topic.hourlyActivity);

          return (
            <div
              key={topic.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => toggleExpanded(topic.id)}
            >
              {/* Trending Rank */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {index + 1}
              </div>

              {/* Topic Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingIcon className={cn('h-4 w-4', getTrendingColor(topic.trendingScore))} />
                  <h4 className="font-medium text-sm truncate">{topic.title}</h4>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className={cn('text-xs', getCategoryColor(topic.category))}>
                    {topic.category.replace('_', ' ')}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {topic.participantCount}
                  </span>
                  {velocityTrend > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      +{Math.round(velocityTrend)}%
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {topics.map((topic, index) => {
        const TrendingIcon = getTrendingIcon(topic.trendingScore);
        const isExpanded = expandedTopic === topic.id;
        const velocityTrend = calculateVelocityTrend(topic.hourlyActivity);

        return (
          <Card key={topic.id} className="chanuka-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Trending Rank */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Topic Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingIcon className={cn('h-5 w-5', getTrendingColor(topic.trendingScore))} />
                      <CardTitle className="text-lg leading-tight">{topic.title}</CardTitle>
                    </div>

                    {/* Topic Metadata */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary" className={getCategoryColor(topic.category)}>
                        {topic.category.replace('_', ' ')}
                      </Badge>
                      
                      {topic.policyAreas.slice(0, 2).map((area) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      
                      {topic.policyAreas.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{topic.policyAreas.length - 2} more
                        </Badge>
                      )}
                    </div>

                    {/* Topic Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {topic.description}
                    </p>
                  </div>
                </div>

                {/* Trending Score */}
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {Math.round(topic.trendingScore * 100)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    trending score
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Engagement Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">{topic.activityCount}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Activity
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">{topic.participantCount}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    Participants
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">{topic.expertCount}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    Experts
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={cn(
                    'text-lg font-semibold',
                    velocityTrend > 0 ? 'text-green-600' : velocityTrend < 0 ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {velocityTrend > 0 ? '+' : ''}{Math.round(velocityTrend)}%
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Velocity
                  </div>
                </div>
              </div>

              {/* Trending Components Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Velocity ({Math.round(topic.velocity * 100)}%)</span>
                  <Progress value={topic.velocity * 100} className="w-24 h-2" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Diversity ({Math.round(topic.diversity * 100)}%)</span>
                  <Progress value={topic.diversity * 100} className="w-24 h-2" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Substance ({Math.round(topic.substance * 100)}%)</span>
                  <Progress value={topic.substance * 100} className="w-24 h-2" />
                </div>
              </div>

              {/* Expandable Details */}
              {showDetails && (
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(topic.id)}
                    className="w-full justify-between"
                  >
                    <span>
                      {isExpanded ? 'Hide Details' : 'Show Details'}
                    </span>
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </Button>

                  {isExpanded && (
                    <div className="space-y-4 pt-3 border-t border-border/50">
                      {/* Geographic Distribution */}
                      {topic.geographicDistribution.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Geographic Distribution
                          </h5>
                          <div className="space-y-2">
                            {topic.geographicDistribution.slice(0, 5).map((geo) => (
                              <div key={geo.state} className="flex items-center justify-between text-sm">
                                <span>{geo.state}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={geo.percentage} className="w-16 h-2" />
                                  <span className="text-xs text-muted-foreground w-8">
                                    {geo.percentage}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related Bills */}
                      {topic.billIds.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Related Bills</h5>
                          <div className="flex flex-wrap gap-2">
                            {topic.billIds.slice(0, 3).map((billId) => (
                              <Button
                                key={billId}
                                variant="outline"
                                size="sm"
                                asChild
                                className="text-xs"
                              >
                                <a href={`/bills/${billId}`}>
                                  Bill #{billId}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            ))}
                            {topic.billIds.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{topic.billIds.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activity Timeline */}
                      <div>
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Activity Timeline (Last 24 Hours)
                        </h5>
                        <div className="flex items-end gap-1 h-16">
                          {topic.hourlyActivity.slice(-24).map((activity, index) => (
                            <div
                              key={index}
                              className="flex-1 bg-primary/20 rounded-t"
                              style={{
                                height: `${Math.max(4, (activity / Math.max(...topic.hourlyActivity)) * 100)}%`
                              }}
                              title={`${activity} activities ${24 - index} hours ago`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Last Updated */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <Clock className="h-3 w-3" />
                        <span>Last updated {formatTimeAgo(topic.lastUpdated)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}