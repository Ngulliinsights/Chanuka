/**
 * Activity Feed - Displays community activity with real-time updates
 * 
 * Features:
 * - Real-time activity updates
 * - Activity type filtering
 * - User interactions (like, share, reply)
 * - Expert verification display
 * - Infinite scroll loading
 * - Mobile-optimized layout
 */

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  ExternalLink,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  FileText,
  Megaphone,
  PenTool,
  Bookmark,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { ActivityItem } from '@client/types/community';
import { ExpertBadge } from '../verification/ExpertBadge';
import { useCommunityStore } from '@client/store/slices/communitySlice';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function ActivityFeed({ 
  activities, 
  loading = false, 
  hasMore = false, 
  onLoadMore,
  className 
}: ActivityFeedProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const { likeActivity, unlikeActivity, shareActivity } = useCommunityStore();

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment':
        return MessageSquare;
      case 'discussion':
        return Users;
      case 'expert_contribution':
        return FileText;
      case 'bill_save':
        return Bookmark;
      case 'bill_share':
        return Share2;
      case 'campaign_join':
        return Megaphone;
      case 'petition_sign':
        return PenTool;
      default:
        return MessageSquare;
    }
  };

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment':
        return 'commented on';
      case 'discussion':
        return 'started a discussion about';
      case 'expert_contribution':
        return 'provided expert analysis on';
      case 'bill_save':
        return 'saved';
      case 'bill_share':
        return 'shared';
      case 'campaign_join':
        return 'joined campaign';
      case 'petition_sign':
        return 'signed petition';
      default:
        return 'interacted with';
    }
  };

  const getActivityTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment':
        return 'text-blue-600';
      case 'discussion':
        return 'text-purple-600';
      case 'expert_contribution':
        return 'text-green-600';
      case 'bill_save':
        return 'text-orange-600';
      case 'bill_share':
        return 'text-cyan-600';
      case 'campaign_join':
        return 'text-red-600';
      case 'petition_sign':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleLike = (activity: ActivityItem) => {
    if (activity.userHasLiked) {
      unlikeActivity(activity.id);
    } else {
      likeActivity(activity.id);
    }
  };

  const handleShare = (activity: ActivityItem) => {
    shareActivity(activity.id);
    // TODO: Implement actual sharing functionality
    console.log('Sharing activity:', activity.id);
  };

  const handleReply = (activity: ActivityItem) => {
    // TODO: Implement reply functionality
    console.log('Replying to activity:', activity.id);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="chanuka-card">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={cn('chanuka-card', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-muted-foreground">
                Be the first to start a discussion or share your thoughts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activities.map((activity) => {
        const IconComponent = getActivityIcon(activity.type);
        const isExpanded = expandedItems.has(activity.id);
        const shouldTruncate = activity.content && activity.content.length > 200;
        const displayContent = shouldTruncate && !isExpanded 
          ? activity.content.slice(0, 200) + '...' 
          : activity.content;

        return (
          <Card key={activity.id} className="chanuka-card hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* User Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                  <AvatarFallback>{getInitials(activity.userName)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Activity Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{activity.userName}</span>
                      
                      {/* Expert Badge */}
                      {activity.expertInfo && (
                        <ExpertBadge 
                          verificationType={activity.expertInfo.verificationType}
                          credibilityScore={activity.expertInfo.credibilityScore}
                          size="sm"
                        />
                      )}

                      {/* Activity Type */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <IconComponent className={cn('h-4 w-4', getActivityTypeColor(activity.type))} />
                        <span>{getActivityTypeLabel(activity.type)}</span>
                      </div>

                      {/* Bill/Entity Link */}
                      {activity.billTitle && (
                        <Badge variant="outline" className="text-xs">
                          {activity.billTitle}
                        </Badge>
                      )}
                    </div>

                    {/* Timestamp and Location */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{activity.location.state}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Title */}
                  <h3 className="font-medium text-sm mb-2 leading-tight">
                    {activity.title}
                  </h3>

                  {/* Activity Content */}
                  {activity.content && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {displayContent}
                      </p>
                      {shouldTruncate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(activity.id)}
                          className="text-xs p-0 h-auto mt-1"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Activity Summary (for expert contributions) */}
                  {activity.summary && activity.type === 'expert_contribution' && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium mb-1">Key Insight:</p>
                      <p className="text-sm text-muted-foreground">{activity.summary}</p>
                    </div>
                  )}

                  {/* Trending Indicator */}
                  {activity.trendingScore > 0.7 && (
                    <div className="flex items-center gap-1 mb-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      <Badge variant="secondary" className="text-xs">
                        Trending
                      </Badge>
                    </div>
                  )}

                  {/* Engagement Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(activity)}
                        className={cn(
                          'text-xs h-auto p-1 flex items-center gap-1',
                          activity.userHasLiked && 'text-red-500'
                        )}
                      >
                        <Heart className={cn(
                          'h-4 w-4',
                          activity.userHasLiked && 'fill-current'
                        )} />
                        <span>{activity.likes}</span>
                      </Button>

                      {/* Reply Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReply(activity)}
                        className="text-xs h-auto p-1 flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{activity.replies}</span>
                      </Button>

                      {/* Share Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(activity)}
                        className="text-xs h-auto p-1 flex items-center gap-1"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>{activity.shares}</span>
                      </Button>
                    </div>

                    {/* External Link */}
                    {activity.billId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs h-auto p-1"
                      >
                        <a href={`/bills/${activity.billId}`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full max-w-xs"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load More Activity'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}