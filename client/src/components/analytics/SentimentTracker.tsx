/**
 * Sentiment Tracker Component
 * 
 * Tracks and displays community sentiment with real-time polling integration,
 * sentiment analysis, and trend visualization.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Meh,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCommunityStore } from '../../store/slices/communitySlice';
import { useWebSocket } from '../../hooks/useWebSocket';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface SentimentTrackerProps {
  sentimentScore: number;
  timeRange: 'hour' | 'day' | 'week' | 'month';
  className?: string;
}

interface SentimentBreakdown {
  bills: SentimentData;
  experts: SentimentData;
  community: SentimentData;
  overall: SentimentData;
}

export function SentimentTracker({ 
  sentimentScore, 
  timeRange,
  className 
}: SentimentTrackerProps) {
  const [sentimentBreakdown, setSentimentBreakdown] = useState<SentimentBreakdown>({
    bills: { positive: 0, neutral: 0, negative: 0, total: 0, trend: 'stable', trendPercentage: 0 },
    experts: { positive: 0, neutral: 0, negative: 0, total: 0, trend: 'stable', trendPercentage: 0 },
    community: { positive: 0, neutral: 0, negative: 0, total: 0, trend: 'stable', trendPercentage: 0 },
    overall: { positive: 0, neutral: 0, negative: 0, total: 0, trend: 'stable', trendPercentage: 0 }
  });

  const [realtimePolling, setRealtimePolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Store data
  const { activityFeed, stats } = useCommunityStore();
  
  // WebSocket for real-time updates
  const { isConnected, getRecentActivity } = useWebSocket({
    subscriptions: [
      { type: 'community', id: 'sentiment' }
    ]
  });

  // Calculate sentiment from activity data
  useEffect(() => {
    const calculateSentiment = () => {
      const now = new Date();
      let timeFilter: Date;
      
      switch (timeRange) {
        case 'hour':
          timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Filter activity by time range
      const recentActivity = activityFeed.filter(activity => 
        new Date(activity.timestamp) >= timeFilter
      );

      // Simulate sentiment analysis (in real app, this would come from NLP service)
      const analyzeSentiment = (activities: typeof recentActivity) => {
        const total = activities.length;
        if (total === 0) return { positive: 0, neutral: 0, negative: 0, total: 0, trend: 'stable' as const, trendPercentage: 0 };

        // Simple sentiment simulation based on engagement metrics
        const positive = activities.filter(activity => {
          const engagementRatio = activity.likes / Math.max(1, activity.replies);
          return engagementRatio > 2 || activity.likes > 10;
        }).length;

        const negative = activities.filter(activity => {
          const engagementRatio = activity.likes / Math.max(1, activity.replies);
          return engagementRatio < 0.5 && activity.replies > activity.likes;
        }).length;

        const neutral = total - positive - negative;

        // Calculate trend (simplified)
        const trend = positive > negative ? 'up' : positive < negative ? 'down' : 'stable';
        const trendPercentage = Math.abs(((positive - negative) / total) * 100);

        return {
          positive,
          neutral,
          negative,
          total,
          trend,
          trendPercentage: Math.round(trendPercentage)
        };
      };

      // Analyze different categories
      const billActivities = recentActivity.filter(activity => 
        activity.type === 'bill_save' || activity.type === 'bill_share' || activity.billId
      );
      
      const expertActivities = recentActivity.filter(activity => 
        activity.expertInfo && activity.expertInfo.verificationType !== 'identity'
      );
      
      const communityActivities = recentActivity.filter(activity => 
        activity.type === 'comment' || activity.type === 'discussion'
      );

      setSentimentBreakdown({
        bills: analyzeSentiment(billActivities),
        experts: analyzeSentiment(expertActivities),
        community: analyzeSentiment(communityActivities),
        overall: analyzeSentiment(recentActivity)
      });

      setLastUpdate(new Date().toLocaleTimeString());
    };

    calculateSentiment();
    
    // Update every 30 seconds if connected
    const interval = isConnected ? setInterval(calculateSentiment, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activityFeed, timeRange, isConnected]);

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return ThumbsUp;
      case 'negative':
        return ThumbsDown;
      default:
        return Meh;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return BarChart3;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Community Sentiment
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? 'Live' : 'Cached'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRealtimePolling(!realtimePolling)}
              className="text-xs"
            >
              {realtimePolling ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Sentiment Score */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-primary">
            {sentimentScore}%
          </div>
          <div className="text-sm text-muted-foreground">
            Overall Positive Sentiment
          </div>
          <Progress value={sentimentScore} className="h-2" />
        </div>

        {/* Sentiment Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Sentiment Breakdown</h4>
          
          {/* Overall */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Community</span>
              <div className="flex items-center gap-1">
                {React.createElement(getTrendIcon(sentimentBreakdown.overall.trend), {
                  className: cn("h-4 w-4", getTrendColor(sentimentBreakdown.overall.trend))
                })}
                <span className={cn("text-xs", getTrendColor(sentimentBreakdown.overall.trend))}>
                  {sentimentBreakdown.overall.trendPercentage}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['positive', 'neutral', 'negative'] as const).map((sentiment) => {
                const value = sentimentBreakdown.overall[sentiment];
                const percentage = formatPercentage(value, sentimentBreakdown.overall.total);
                const Icon = getSentimentIcon(sentiment);
                
                return (
                  <div key={sentiment} className="text-center p-2 rounded-md border">
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", getSentimentColor(sentiment).split(' ')[0])} />
                    <div className="text-lg font-bold">{percentage}%</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {sentiment}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            {[
              { key: 'bills', label: 'Bills Discussion', icon: BarChart3 },
              { key: 'experts', label: 'Expert Insights', icon: Users },
              { key: 'community', label: 'General Discussion', icon: MessageSquare }
            ].map(({ key, label, icon: Icon }) => {
              const data = sentimentBreakdown[key as keyof SentimentBreakdown];
              const positivePercentage = formatPercentage(data.positive, data.total);
              
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{positivePercentage}%</span>
                    <Badge variant="outline" className="text-xs">
                      {data.total} items
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Polling Status */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected && realtimePolling ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-sm">
              {isConnected && realtimePolling ? 'Real-time updates active' : 'Using cached data'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdate}
          </span>
        </div>

        {/* Sentiment Alerts */}
        {sentimentScore < 30 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div className="text-sm">
              <div className="font-medium text-red-700">Low Community Sentiment</div>
              <div className="text-red-600">
                Consider reviewing recent discussions for potential issues
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <BarChart3 className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-1" />
            Moderate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SentimentTracker;