/**
 * Real-Time Engagement Analytics Dashboard
 * 
 * Implements task 12: Real-Time Engagement Analytics Dashboard
 * - Impact panel with live metrics (community approval, participants, expert support)
 * - Personal civic engagement scores with transparent methodology
 * - Community sentiment tracking with real-time polling integration
 * - Expert verification indicators with live credibility scoring
 * - Engagement statistics with contribution rankings and gamification elements
 * - Temporal analytics with hourly, daily, and weekly trend views
 * 
 * Requirements: REQ-CE-001
 */

import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Award,
  Target,
  Activity,
  Clock,
  Zap,
  Star,
  Trophy,
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Share2
} from 'lucide-react';
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

import { useRealTimeEngagement } from '@client/hooks/useRealTimeEngagement';
import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';

import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';



// Types for real-time engagement analytics
interface LiveMetrics {
  communityApproval: number;
  totalParticipants: number;
  expertSupport: number;
  activeDiscussions: number;
  lastUpdated: string;
}

interface PersonalEngagementScore {
  totalScore: number;
  breakdown: {
    participation: number;
    quality: number;
    expertise: number;
    community: number;
  };
  rank: number;
  totalUsers: number;
  trend: 'up' | 'down' | 'stable';
  methodology: {
    description: string;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
      currentScore: number;
    }>;
  };
}

interface Communitysentiment {
  overall: 'positive' | 'neutral' | 'negative';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trending: Array<{
    topic: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    change: number;
    volume: number;
  }>;
  polls: Array<{
    id: string;
    question: string;
    responses: number;
    results: Array<{
      option: string;
      votes: number;
      percentage: number;
    }>;
    endTime: string;
  }>;
}

interface ExpertMetrics {
  totalExperts: number;
  activeExperts: number;
  averageCredibility: number;
  verificationStats: {
    official: number;
    domain: number;
    identity: number;
  };
  topExperts: Array<{
    id: string;
    name: string;
    credibilityScore: number;
    specializations: string[];
    recentContributions: number;
    communityRating: number;
  }>;
}

interface EngagementStats {
  leaderboard: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
    badge: string;
    contributions: {
      comments: number;
      votes: number;
      shares: number;
    };
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedBy: number;
  }>;
  streaks: {
    current: number;
    longest: number;
    type: 'daily' | 'weekly';
  };
}

interface TemporalAnalytics {
  hourly: Array<{
    hour: number;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
  daily: Array<{
    date: string;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
  weekly: Array<{
    week: string;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
}

interface RealTimeEngagementData {
  liveMetrics: LiveMetrics;
  personalScore: PersonalEngagementScore;
  sentiment: Communitysentiment;
  expertMetrics: ExpertMetrics;
  stats: EngagementStats;
  temporal: TemporalAnalytics;
}

interface RealTimeEngagementDashboardProps {
  className?: string;
  billId?: number;
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#6b7280',
  negative: '#ef4444'
};

const BADGE_COLORS = {
  common: '#6b7280',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b'
};

export function RealTimeEngagementDashboard({ className, billId }: RealTimeEngagementDashboardProps) {
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Use the real-time engagement hook
  const { 
    data, 
    loading, 
    error, 
    isConnected, 
    refresh, 
    exportData 
  } = useRealTimeEngagement({
    billId,
    autoRefresh: true,
    enableRealTime: true
  });

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get badge color
  const getBadgeColor = (rarity: string) => {
    return BADGE_COLORS[rarity as keyof typeof BADGE_COLORS] || BADGE_COLORS.common;
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading engagement analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className={cn('border-red-200 bg-red-50', className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No engagement data available</AlertDescription>
      </Alert>
    );
  }

  const { liveMetrics, personalScore, sentiment, expertMetrics, stats, temporal } = data;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Real-Time Engagement Analytics
          </h2>
          <p className="text-muted-foreground">
            Live insights into community engagement and participation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <Button onClick={refresh} disabled={loading} size="sm">
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => exportData('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Live Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Approval</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(liveMetrics.communityApproval * 100).toFixed(1)}%
            </div>
            <Progress value={liveMetrics.communityApproval * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Based on {formatNumber(liveMetrics.totalParticipants)} participants
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(liveMetrics.totalParticipants)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(liveMetrics.activeDiscussions)} active discussions
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expert Support</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(liveMetrics.expertSupport * 100).toFixed(1)}%
            </div>
            <Progress value={liveMetrics.expertSupport * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(expertMetrics.activeExperts)} experts active
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Civic Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personalScore.totalScore.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(personalScore.trend)}
              <span className="ml-1">
                Rank #{personalScore.rank} of {formatNumber(personalScore.totalUsers)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="experts">Experts</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Engagement Score Breakdown */}
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Your Engagement Score</CardTitle>
                <CardDescription>
                  Transparent methodology breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {personalScore.totalScore.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Civic Engagement Score
                  </div>
                </div>

                <div className="space-y-3">
                  {personalScore.methodology.factors.map((factor, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{factor.name}</span>
                        <span>{factor.currentScore}/{(factor.weight * 100).toFixed(0)}</span>
                      </div>
                      <Progress 
                        value={(factor.currentScore / factor.weight) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {factor.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {personalScore.methodology.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Community Sentiment Overview */}
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Community Sentiment</CardTitle>
                <CardDescription>
                  Real-time sentiment analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge 
                      variant={sentiment.overall === 'positive' ? 'default' : 'secondary'}
                      className="text-lg px-4 py-2"
                    >
                      {sentiment.overall.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Positive</span>
                      <span>{(sentiment.distribution.positive * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={sentiment.distribution.positive * 100} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Neutral</span>
                      <span>{(sentiment.distribution.neutral * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={sentiment.distribution.neutral * 100} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Negative</span>
                      <span>{(sentiment.distribution.negative * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={sentiment.distribution.negative * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Polls */}
          {sentiment.polls.length > 0 && (
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Active Community Polls</CardTitle>
                <CardDescription>
                  Real-time polling integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {sentiment.polls.map((poll) => (
                    <div key={poll.id} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{poll.question}</h4>
                        <Badge variant="outline">
                          {formatNumber(poll.responses)} responses
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {poll.results.map((result, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{result.option}</span>
                              <span>{result.percentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={result.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
                <CardDescription>
                  Community opinion breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: sentiment.distribution.positive, color: SENTIMENT_COLORS.positive },
                        { name: 'Neutral', value: sentiment.distribution.neutral, color: SENTIMENT_COLORS.neutral },
                        { name: 'Negative', value: sentiment.distribution.negative, color: SENTIMENT_COLORS.negative }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {[
                        { name: 'Positive', value: sentiment.distribution.positive, color: SENTIMENT_COLORS.positive },
                        { name: 'Neutral', value: sentiment.distribution.neutral, color: SENTIMENT_COLORS.neutral },
                        { name: 'Negative', value: sentiment.distribution.negative, color: SENTIMENT_COLORS.negative }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
                <CardDescription>
                  Sentiment trends by topic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentiment.trending.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{trend.topic}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatNumber(trend.volume)} mentions
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={trend.sentiment === 'positive' ? 'default' : 'secondary'}
                          style={{ 
                            backgroundColor: SENTIMENT_COLORS[trend.sentiment],
                            color: 'white'
                          }}
                        >
                          {trend.sentiment}
                        </Badge>
                        <div className="flex items-center text-sm">
                          {trend.change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={trend.change > 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(trend.change).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Expert Verification Stats</CardTitle>
                <CardDescription>
                  Live credibility indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{expertMetrics.totalExperts}</div>
                      <div className="text-sm text-muted-foreground">Total Experts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{expertMetrics.activeExperts}</div>
                      <div className="text-sm text-muted-foreground">Active Now</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Official Experts</span>
                      <span>{expertMetrics.verificationStats.official}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Domain Experts</span>
                      <span>{expertMetrics.verificationStats.domain}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Identity Verified</span>
                      <span>{expertMetrics.verificationStats.identity}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {expertMetrics.averageCredibility.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Average Credibility Score
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Top Experts</CardTitle>
                <CardDescription>
                  Highest credibility scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expertMetrics.topExperts.slice(0, 5).map((expert, index) => (
                    <div key={expert.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{expert.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {expert.specializations.slice(0, 2).join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{expert.credibilityScore.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {expert.recentContributions} contributions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Engagement Leaderboard</CardTitle>
                <CardDescription>
                  Top contributors with gamification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.leaderboard.slice(0, 10).map((user) => (
                    <div key={user.userId} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {user.rank <= 3 ? (
                          <Trophy className={cn(
                            'h-6 w-6',
                            user.rank === 1 ? 'text-yellow-500' :
                            user.rank === 2 ? 'text-gray-400' :
                            'text-amber-600'
                          )} />
                        ) : (
                          <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {user.rank}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">{user.username}</span>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ color: getBadgeColor(user.badge) }}
                          >
                            {user.badge}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.contributions.comments} comments • {user.contributions.votes} votes • {user.contributions.shares} shares
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatNumber(user.score)}</div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="chanuka-card">
              <CardHeader>
                <CardTitle>Achievements & Streaks</CardTitle>
                <CardDescription>
                  Gamification elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.streaks.current}</div>
                  <div className="text-sm text-muted-foreground">
                    Current {stats.streaks.type} streak
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Longest: {stats.streaks.longest} days
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Recent Achievements</h4>
                  {stats.achievements.slice(0, 5).map((achievement) => (
                    <div key={achievement.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {achievement.description}
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        style={{ color: getBadgeColor(achievement.rarity) }}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="chanuka-card">
            <CardHeader>
              <CardTitle>Temporal Analytics</CardTitle>
              <CardDescription>
                Engagement patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={timeframe} onValueChange={(value: 'hourly' | 'daily' | 'weekly') => setTimeframe(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>

                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={temporal[timeframe]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={timeframe === 'hourly' ? 'hour' : timeframe === 'daily' ? 'date' : 'week'} 
                    />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="Engagement"
                    />
                    <Area
                      type="monotone"
                      dataKey="participants"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Participants"
                    />
                    <Area
                      type="monotone"
                      dataKey="sentiment"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.3}
                      name="Sentiment Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}