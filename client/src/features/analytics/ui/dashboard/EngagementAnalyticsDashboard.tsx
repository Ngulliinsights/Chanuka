/**
 * Engagement Analytics Dashboard Component
 * 
 * Provides comprehensive real-time engagement analytics with live metrics display,
 * personal civic engagement scoring, community sentiment tracking, temporal analytics,
 * and gamification elements.
 */

import {
  Activity,
  Users,
  MessageSquare,
  Award,
  Target,
  Eye,
  ThumbsUp,
  FileText
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

import { cn } from '@client/lib/utils';
import { Badge } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

import { CivicScoreCard } from '../metrics/CivicScoreCard';

interface EngagementAnalyticsDashboardProps {
  className?: string;
  showPersonalMetrics?: boolean;
  showCommunityMetrics?: boolean;
  showTemporalAnalytics?: boolean;
  showGamification?: boolean;
}

interface LiveMetrics {
  activeUsers: number;
  totalEngagement: number;
  commentsToday: number;
  billsViewed: number;
  expertContributions: number;
  communityScore: number;
  sentimentScore: number;
  trendingTopics: number;
}

interface PersonalCivicScore {
  totalScore: number;
  level: string;
  nextLevelProgress: number;
  breakdown: {
    participation: number;
    quality: number;
    consistency: number;
    impact: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  streaks: {
    current: number;
    longest: number;
    type: 'daily' | 'weekly';
  };
}

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  bill_id?: string;
}

export function EngagementAnalyticsDashboard({
  className,
  showPersonalMetrics = true,
  showCommunityMetrics = true,
  showTemporalAnalytics = true,
}: EngagementAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [isConnected, setIsConnected] = useState(true);
  
  // Mock data for demonstration
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    activeUsers: 1247,
    totalEngagement: 8934,
    commentsToday: 156,
    billsViewed: 2341,
    expertContributions: 23,
    communityScore: 78,
    sentimentScore: 72,
    trendingTopics: 8
  });

  const [personalScore, setPersonalScore] = useState<PersonalCivicScore>({
    totalScore: 68,
    level: 'Civic Advocate',
    nextLevelProgress: 40,
    breakdown: {
      participation: 75,
      quality: 82,
      consistency: 45,
      impact: 70
    },
    achievements: [
      {
        id: 'first_comments',
        title: 'Voice Heard',
        description: 'Made your first 10 comments',
        icon: 'MessageSquare',
        earnedAt: new Date().toISOString()
      },
      {
        id: 'expert_contributor',
        title: 'Expert Contributor',
        description: 'Provided 5 expert insights',
        icon: 'Award',
        earnedAt: new Date().toISOString()
      }
    ],
    streaks: {
      current: 7,
      longest: 14,
      type: 'daily'
    }
  });

  const [recentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'new_comment',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      bill_id: 'HB-2024-001'
    },
    {
      id: '2',
      type: 'bill_view',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      bill_id: 'SB-2024-045'
    },
    {
      id: '3',
      type: 'expert_analysis',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      bill_id: 'HB-2024-012'
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10 - 5),
        commentsToday: prev.commentsToday + Math.floor(Math.random() * 3),
        billsViewed: prev.billsViewed + Math.floor(Math.random() * 5)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Memoized metric cards for optimal performance
  const metricCards = useMemo(() => [
    {
      title: 'Active Users',
      value: liveMetrics.activeUsers.toLocaleString(),
      change: '+12%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Comments Today',
      value: liveMetrics.commentsToday.toLocaleString(),
      change: '+8%',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Bills Viewed',
      value: liveMetrics.billsViewed.toLocaleString(),
      change: '+15%',
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Expert Insights',
      value: liveMetrics.expertContributions.toLocaleString(),
      change: '+5%',
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ], [liveMetrics]);

  // Helper function to format timestamps in a human-readable way
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with status indicator and time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Engagement Analytics</h2>
          <p className="text-muted-foreground">
            Real-time civic engagement metrics and community insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
            <Activity className={cn("h-3 w-3", isConnected && "animate-pulse")} />
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-1 text-sm border rounded-md"
            aria-label="Time range selection"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div>

      {/* Live Metrics Overview - Four key metrics at a glance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-green-600">{metric.change}</p>
                </div>
                <div className={cn("p-2 rounded-md", metric.bgColor)}>
                  <metric.icon className={cn("h-5 w-5", metric.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs - Organized into logical sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal Score</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="temporal">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab - High-level dashboard view */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Community Sentiment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-red-500" />
                  Community Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Sentiment</span>
                    <Badge variant={liveMetrics.sentimentScore >= 70 ? "default" : "secondary"}>
                      {liveMetrics.sentimentScore >= 70 ? 'Positive' : 
                       liveMetrics.sentimentScore >= 40 ? 'Neutral' : 'Negative'}
                    </Badge>
                  </div>
                  <Progress value={liveMetrics.sentimentScore} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    {liveMetrics.sentimentScore}% positive engagement
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Quality Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Engagement Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quality Score</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {liveMetrics.communityScore}%
                    </span>
                  </div>
                  <Progress value={liveMetrics.communityScore} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    Based on expert participation and discussion depth
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed - Shows live community activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-md border">
                    <div className="flex-shrink-0">
                      {activity.bill_id ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.bill_id 
                          ? `Bill ${activity.bill_id} updated`
                          : 'Community discussion'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type.replace('_', ' ')} • {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Score Tab - Individual user metrics and achievements */}
        <TabsContent value="personal" className="space-y-4">
          {showPersonalMetrics && (
            <CivicScoreCard score={personalScore} showMethodology={true} />
          )}
        </TabsContent>

        {/* Community Tab - Community-wide metrics */}
        <TabsContent value="community" className="space-y-4">
          {showCommunityMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Community Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{liveMetrics.activeUsers}</div>
                      <div className="text-sm text-muted-foreground">Active Members</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Daily Activity</span>
                        <span>78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Expert A', 'Expert B', 'Expert C'].map((name, index) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <Badge variant="secondary">{100 - index * 10} pts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Temporal Analytics Tab - Time-based trends */}
        <TabsContent value="temporal" className="space-y-4">
          {showTemporalAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4" />
                    <p>Engagement trends chart would be displayed here</p>
                    <p className="text-sm">Showing data for: {timeRange}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EngagementAnalyticsDashboard;