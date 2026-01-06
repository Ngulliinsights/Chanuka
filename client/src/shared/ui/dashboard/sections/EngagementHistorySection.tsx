/**
 * Engagement History Section Component
 *
 * Displays user's engagement history with temporal filtering and activity insights.
 */

import { formatDistanceToNow, format } from 'date-fns';
import {
  Activity,
  Eye,
  MessageSquare,
  Share2,
  ThumbsUp,
  BookOpen,
  Award,
  ExternalLink,
  Star,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/shared/design-system/feedback/Badge';
import { Button } from '@/shared/design-system/interactive/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import { EngagementHistoryItem } from '@/shared/types/user-dashboard';

import styles from './DashboardSections.module.css';

interface EngagementHistorySectionProps {
  history: EngagementHistoryItem[];
  loading?: boolean;
  compact?: boolean;
}

export function EngagementHistorySection({
  history,
  loading = false,
  compact = false,
}: EngagementHistorySectionProps) {
  const getActivityIcon = (type: EngagementHistoryItem['type']) => {
    switch (type) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'share':
        return <Share2 className="h-4 w-4" />;
      case 'save':
        return <Star className="h-4 w-4" />;
      case 'vote':
        return <ThumbsUp className="h-4 w-4" />;
      case 'expert_contribution':
        return <Award className="h-4 w-4" />;
      default:
        // Use Heart for other activities as a fallback if needed, or remove if unused
        // Keeping it for now to satisfy the import but it seems unused in current switch
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (item: EngagementHistoryItem) => {
    switch (item.type) {
      case 'view': {
        return `Viewed ${item.billTitle || 'a bill'}`;
      }
      case 'comment': {
        return `Commented on ${item.billTitle || 'a bill'}`;
      }
      case 'share': {
        const target = item.metadata?.shareTarget;
        return `Shared ${item.billTitle || 'a bill'}${target ? ` on ${target}` : ''}`;
      }
      case 'save': {
        return `Saved ${item.billTitle || 'a bill'}`;
      }
      case 'vote': {
        const voteType = item.metadata?.voteType;
        return `${voteType === 'up' ? 'Upvoted' : 'Down-voted'} a comment on ${item.billTitle || 'a bill'}`;
      }
      case 'expert_contribution': {
        const contributionType = item.metadata?.contributionType;
        return `Provided ${contributionType || 'expert input'} on ${item.billTitle || 'a bill'}`;
      }
      default:
        return 'Unknown activity';
    }
  };

  // Group activities by date for better organization
  const groupedHistory = history.reduce(
    (groups, item) => {
      const date = format(new Date(item.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    },
    {} as Record<string, EngagementHistoryItem[]>
  );

  const sortedDates = Object.keys(groupedHistory).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No recent activity</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start engaging with bills to see your activity history here.
            </p>
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Bills
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
            <Badge variant="secondary">{history.length}</Badge>
          </CardTitle>
          {!compact && (
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedDates.slice(0, compact ? 3 : 10).map(date => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-medium text-muted-foreground">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex-1 h-px bg-border"></div>
                <Badge variant="outline" className="text-xs">
                  {groupedHistory[date].length} activities
                </Badge>
              </div>

              {/* Activities for this date */}
              <div className="space-y-3 ml-4">
                {groupedHistory[date].map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Activity Icon */}
                    <div
                      className={`${styles.iconContainer} ${styles[`activity${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`]}`}
                      data-activity-type={item.type}
                    >
                      {getActivityIcon(item.type)}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{getActivityDescription(item)}</p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), 'h:mm a')}
                        </span>

                        {item.billId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-civic-community hover:text-civic-community/80"
                          >
                            View Bill
                          </Button>
                        )}
                      </div>

                      {/* Additional metadata */}
                      {item.metadata && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {item.type === 'comment' && item.metadata.commentId && (
                            <span>Comment ID: {item.metadata.commentId}</span>
                          )}
                          {item.type === 'expert_contribution' &&
                            item.metadata.contributionType && (
                              <Badge variant="outline" className="text-xs">
                                {item.metadata.contributionType}
                              </Badge>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Time indicator */}
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Activity Summary */}
        {!compact && history.length > 0 && (
          <div className="pt-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  type: 'view',
                  label: 'Views',
                  count: history.filter(h => h.type === 'view').length,
                },
                {
                  type: 'comment',
                  label: 'Comments',
                  count: history.filter(h => h.type === 'comment').length,
                },
                {
                  type: 'share',
                  label: 'Shares',
                  count: history.filter(h => h.type === 'share').length,
                },
                {
                  type: 'save',
                  label: 'Saves',
                  count: history.filter(h => h.type === 'save').length,
                },
              ].map(stat => (
                <div key={stat.type} className="text-center">
                  <div
                    className={`${styles.statDisplay} ${styles[`activity${stat.type.charAt(0).toUpperCase() + stat.type.slice(1)}`]}`}
                    data-activity-type={stat.type}
                  >
                    {stat.count}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {compact && history.length > 5 && (
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All Activity History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
