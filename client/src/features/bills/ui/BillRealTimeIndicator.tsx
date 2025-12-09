/**
 * Bill Real-time Indicator Component
 * 
 * Shows real-time status updates, engagement metrics, and activity indicators
 * for individual bills using WebSocket integration.
 */

import { 
  Activity, 
  MessageSquare, 
  Users, 
  TrendingUp,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@client/shared/design-system/primitives/badge';
import { cn } from '@client/lib/utils';
import { BillRealTimeUpdate } from '@client/types/realtime';

// Mock implementation until WebSocket hook is ready
const useBillRealTime = (_billId: number) => ({
  isConnected: false,
  billUpdates: [] as BillRealTimeUpdate[],
  engagementMetrics: {
    view_count: 0,
    comment_count: 0,
    save_count: 0,
    share_count: 0,
    community_sentiment: 'neutral' as 'positive' | 'negative' | 'neutral',
    controversy_level: 'low' as 'low' | 'medium' | 'high'
  }
});

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

  // Track the most recent update and trigger animation
  useEffect(() => {
    if (billUpdates.length > 0) {
      const latest = billUpdates[billUpdates.length - 1];
      // Check if this is a new update by comparing timestamps
      if (!recentUpdate || latest.timestamp !== recentUpdate.timestamp) {
        setRecentUpdate(latest);
        setShowUpdateAnimation(true);
        
        // Remove animation after 3 seconds to avoid visual clutter
        const timer = setTimeout(() => {
          setShowUpdateAnimation(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [billUpdates, recentUpdate]);

  // Map update types to their corresponding icons for visual clarity
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

  // Provide human-readable labels for update types
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

  // Convert timestamps to relative time strings (e.g., "5m ago", "2h ago")
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

  // Format large numbers with K/M suffixes for readability
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Compact mode: minimal display for tight spaces
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Connection status indicator */}
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-gray-400"
        )} />
        
        {/* Show most recent update with pulse animation */}
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
        
        {/* Quick engagement metrics overview */}
        {showEngagementMetrics && engagementMetrics && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(engagementMetrics.view_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {formatNumber(engagementMetrics.comment_count)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full mode: comprehensive display with all metrics and updates
  return (
    <div className={cn("space-y-3", className)}>
      {/* Connection status header */}
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

      {/* Display the most recent update with visual emphasis */}
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

      {/* Grid of engagement statistics */}
      {showEngagementMetrics && engagementMetrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-blue-600">
              {formatNumber(engagementMetrics.view_count)}
            </div>
            <div className="text-xs text-muted-foreground">Views</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-green-600">
              {formatNumber(engagementMetrics.comment_count)}
            </div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-purple-600">
              {formatNumber(engagementMetrics.save_count)}
            </div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
          
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="text-lg font-semibold text-orange-600">
              {formatNumber(engagementMetrics.share_count)}
            </div>
            <div className="text-xs text-muted-foreground">Shares</div>
          </div>
        </div>
      )}

      {/* Community sentiment indicator */}
      {engagementMetrics && (
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
          <span className="text-xs text-muted-foreground">Community Sentiment</span>
          <Badge 
            variant={
              engagementMetrics.community_sentiment === 'positive' ? 'default' :
              engagementMetrics.community_sentiment === 'negative' ? 'destructive' :
              'secondary'
            }
            className="text-xs"
          >
            {engagementMetrics.community_sentiment}
          </Badge>
        </div>
      )}

      {/* Show controversy warning only when level is medium or high */}
      {engagementMetrics && engagementMetrics.controversy_level !== 'low' && (
        <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-200">
          <span className="text-xs text-yellow-800">Controversy Level</span>
          <Badge 
            variant={engagementMetrics.controversy_level === 'high' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {engagementMetrics.controversy_level}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default BillRealTimeIndicator;