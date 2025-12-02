/**
 * Bill Real-time Indicator Component
 * 
 * Shows real-time status updates, engagement metrics, and activity indicators
 * for individual bills using WebSocket integration.
 */

import React, { useEffect, useState } from 'react';
import { useBillRealTime } from '@client/hooks/useWebSocket';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Activity, 
  MessageSquare, 
  Users, 
  TrendingUp,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { BillRealTimeUpdate, EngagementMetricsUpdate } from '@client/types/realtime';

interface BillRealTimeIndicatorProps {
  billId: number;
  className?: string;
  showEngagementMetrics?: boolean;
  showRecentUpdates?: boolean;
  compact?: boolean;
}

export function BillRealTimeIndicator({
  billId,
  className,
  showEngagementMetrics = true,
  showRecentUpdates = true,
  compact = false
}: BillRealTimeIndicatorProps) {
  const {
    isConnected,
    billUpdates,
    engagementMetrics
  } = useBillRealTime(billId);

  const [recentUpdate, setRecentUpdate] = useState<BillRealTimeUpdate | null>(null);
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

  // Track the most recent update
  useEffect(() => {
    if (billUpdates.length > 0) {
      const latest = billUpdates[billUpdates.length - 1];
      if (!recentUpdate || latest.timestamp !== recentUpdate.timestamp) {
        setRecentUpdate(latest);
        setShowUpdateAnimation(true);
        
        // Remove animation after 3 seconds
        const timer = setTimeout(() => {
          setShowUpdateAnimation(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [billUpdates, recentUpdate]);

  const getUpdateIcon = (updateType: string) => {
    switch (updateType) {
      case 'status_change':
        return <AlertCircle className="h-3 w-3" />;
      case 'new_comment':
        return <MessageSquare className="h-3 w-3" />;
      case 'amendment':
        return <Clock className="h-3 w-3" />;
      case 'voting_scheduled':
        return <TrendingUp className="h-3 w-3" />;
      case 'engagement_change':
        return <Users className="h-3 w-3" />;
      case 'constitutional_flag':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'expert_analysis':
        return <Activity className="h-3 w-3 text-blue-500" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getUpdateTypeLabel = (updateType: string) => {
    switch (updateType) {
      case 'status_change':
        return 'Status Updated';
      case 'new_comment':
        return 'New Comment';
      case 'amendment':
        return 'Amendment Added';
      case 'voting_scheduled':
        return 'Vote Scheduled';
      case 'engagement_change':
        return 'Engagement Updated';
      case 'constitutional_flag':
        return 'Constitutional Alert';
      case 'expert_analysis':
        return 'Expert Analysis';
      default:
        return 'Updated';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Connection indicator */}
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-gray-400"
        )} />
        
        {/* Recent update indicator */}
        {recentUpdate && (
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs flex items-center gap-1",
              showUpdateAnimation && "animate-pulse bg-blue-100 text-blue-700"
            )}
          >
            {getUpdateIcon(recentUpdate.type)}
            {formatTimestamp(recentUpdate.timestamp)}
          </Badge>
        )}
        
        {/* Engagement metrics */}
        {showEngagementMetrics && engagementMetrics && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(engagementMetrics.metrics.view_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {formatNumber(engagementMetrics.metrics.comment_count)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-gray-400"
          )} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live Updates' : 'Offline Mode'}
          </span>
        </div>
        
        {billUpdates.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {billUpdates.length} updates
          </Badge>
        )}
      </div>

      {/* Recent Updates */}
      {showRecentUpdates && recentUpdate && (
        <div className={cn(
          "p-3 rounded-md border bg-card",
          showUpdateAnimation && "border-blue-200 bg-blue-50"
        )}>
          <div className="flex items-start gap-2">
            {getUpdateIcon(recentUpdate.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {getUpdateTypeLabel(recentUpdate.type)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(recentUpdate.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Metrics */}
      {showEngagementMetrics && engagementMetrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-blue-600">
              {formatNumber(engagementMetrics.metrics.view_count)}
            </div>
            <div className="text-xs text-muted-foreground">Views</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-green-600">
              {formatNumber(engagementMetrics.metrics.comment_count)}
            </div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-purple-600">
              {formatNumber(engagementMetrics.metrics.save_count)}
            </div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-orange-600">
              {formatNumber(engagementMetrics.metrics.share_count)}
            </div>
            <div className="text-xs text-muted-foreground">Shares</div>
          </div>
        </div>
      )}

      {/* Community Sentiment */}
      {engagementMetrics && (
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
          <span className="text-xs text-muted-foreground">Community Sentiment</span>
          <Badge 
            variant={
              engagementMetrics.metrics.community_sentiment === 'positive' ? 'default' :
              engagementMetrics.metrics.community_sentiment === 'negative' ? 'destructive' :
              'secondary'
            }
            className="text-xs"
          >
            {engagementMetrics.metrics.community_sentiment}
          </Badge>
        </div>
      )}

      {/* Controversy Level */}
      {engagementMetrics && engagementMetrics.metrics.controversy_level !== 'low' && (
        <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-200">
          <span className="text-xs text-yellow-800">Controversy Level</span>
          <Badge 
            variant={engagementMetrics.metrics.controversy_level === 'high' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {engagementMetrics.metrics.controversy_level}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default BillRealTimeIndicator;