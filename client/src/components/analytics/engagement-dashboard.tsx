import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
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
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  MessageSquare, 
  Share2,
  Activity,
  AlertTriangle,
  Download,
  Filter,
  Calendar,
  BarChart3
} from 'lucide-react';
import { logger } from '@/utils/browser-logger';

interface EngagementMetrics {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueUsers: number;
  averageEngagementScore: number;
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  topCategories: Array<{
    category: string;
    engagementScore: number;
    billCount: number;
  }>;
  userSegments: {
    highlyEngaged: number;
    moderatelyEngaged: number;
    lowEngaged: number;
  };
}

interface BillInteractionPattern {
  billId: number;
  billTitle: string;
  category: string;
  totalEngagement: number;
  viewPattern: {
    peakHours: number[];
    peakDays: string[];
    averageSessionDuration: number;
  };
  commentPattern: {
    averageCommentsPerUser: number;
    expertCommentRatio: number;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
}

interface UserEngagementProfile {
  userId: string;
  userName: string;
  role: string;
  engagementLevel: 'high' | 'medium' | 'low';
  totalEngagementScore: number;
  preferredCategories: string[];
  interactionTypes: {
    views: number;
    comments: number;
    shares: number;
    bookmarks: number;
  };
}

interface TrendAnalysis {
  timeframe: 'daily' | 'weekly' | 'monthly';
  period: string;
  metrics: {
    totalEngagement: number;
    newUsers: number;
    returningUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  topTrends: Array<{
    type: 'bill' | 'category' | 'sponsor' | 'topic';
    name: string;
    engagementGrowth: number;
    significance: 'high' | 'medium' | 'low';
  }>;
  comparativePeriod: {
    engagementChange: number;
    userGrowth: number;
    contentGrowth: number;
  };
}

interface DashboardData {
  overview: EngagementMetrics;
  recentTrends: TrendAnalysis[];
  topBills: BillInteractionPattern[];
  topUsers: UserEngagementProfile[];
  alerts: Array<{
    type: 'spike' | 'drop' | 'anomaly';
    message: string;
    severity: 'high' | 'medium' | 'low';
    data: any;
  }>;
}

export function EngagementDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/engagement-analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: string, format: string) => {
    try {
      const response = await fetch(`/api/engagement-analytics/export?type=${type}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engagement-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      logger.error('Export failed:', { component: 'Chanuka' }, err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No dashboard data available</AlertDescription>
      </Alert>
    );
  }

  const { overview, recentTrends, topBills, topUsers, alerts } = dashboardData;

  // Prepare chart data
  const trendChartData = recentTrends.map(trend => ({
    period: trend.period.split(' to ')[0],
    engagement: trend.metrics.totalEngagement,
    users: trend.metrics.newUsers + trend.metrics.returningUsers,
    sessionDuration: trend.metrics.averageSessionDuration
  }));

  const categoryChartData = overview.topCategories.map(cat => ({
    name: cat.category,
    engagement: cat.engagementScore,
    bills: cat.billCount
  }));

  const userSegmentData = [
    { name: 'Highly Engaged', value: overview.userSegments.highlyEngaged, color: '#10b981' },
    { name: 'Moderately Engaged', value: overview.userSegments.moderatelyEngaged, color: '#f59e0b' },
    { name: 'Low Engaged', value: overview.userSegments.lowEngaged, color: '#ef4444' }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Engagement Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into legislative engagement patterns</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportData('metrics', 'json')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} className={getAlertColor(alert.severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">{alert.type.toUpperCase()}:</span> {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalViews.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(overview.engagementTrend)}
              <span className="ml-1">{overview.engagementTrend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalComments.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Avg: {(overview.totalComments / Math.max(overview.uniqueUsers, 1)).toFixed(1)} per user
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalShares.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {((overview.totalShares / Math.max(overview.totalViews, 1)) * 100).toFixed(1)}% share rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.uniqueUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Avg engagement: {overview.averageEngagementScore.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="bills">Bill Analysis</TabsTrigger>
          <TabsTrigger value="users">User Insights</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>
                Track engagement patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                    name="Total Engagement"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3}
                    name="Active Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Segments</CardTitle>
                <CardDescription>Distribution of user engagement levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={userSegmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {userSegmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  {userSegmentData.map((segment, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm">{segment.name}: {segment.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Trending Topics</CardTitle>
                <CardDescription>Most engaging topics this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTrends[0]?.topTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{trend.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{trend.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={trend.significance === 'high' ? 'default' : 'secondary'}>
                          {trend.significance}
                        </Badge>
                        <span className="text-sm font-medium text-green-600">
                          +{trend.engagementGrowth}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Bills</CardTitle>
              <CardDescription>Bills with highest engagement scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topBills.slice(0, 10).map((bill, index) => (
                  <div key={bill.billId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{bill.billTitle}</div>
                      <div className="text-sm text-gray-500">
                        Category: {bill.category} • Engagement: {bill.totalEngagement}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>Peak Hours: {bill.viewPattern.peakHours.join(', ')}</span>
                        <span>Avg Session: {bill.viewPattern.averageSessionDuration}min</span>
                        <span>Expert Comments: {(bill.commentPattern.expertCommentRatio * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">#{index + 1}</div>
                      <Badge variant="outline">{bill.category}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Engaged Users</CardTitle>
              <CardDescription>Users with highest engagement scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.slice(0, 10).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-sm text-gray-500">
                        Role: {user.role} • Level: {user.engagementLevel}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>Views: {user.interactionTypes.views}</span>
                        <span>Comments: {user.interactionTypes.comments}</span>
                        <span>Shares: {user.interactionTypes.shares}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {user.preferredCategories.slice(0, 3).map((category, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">#{index + 1}</div>
                      <div className="text-sm text-gray-500">
                        Score: {user.totalEngagementScore}
                      </div>
                      <Badge 
                        variant={user.engagementLevel === 'high' ? 'default' : 
                                user.engagementLevel === 'medium' ? 'secondary' : 'outline'}
                      >
                        {user.engagementLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Engagement by bill category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#3b82f6" name="Engagement Score" />
                  <Bar dataKey="bills" fill="#10b981" name="Bill Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overview.topCategories.map((category, index) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                  <CardDescription>
                    {category.billCount} bills • Rank #{index + 1}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {category.engagementScore.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Average per bill: {(category.engagementScore / category.billCount).toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(category.engagementScore / Math.max(...overview.topCategories.map(c => c.engagementScore))) * 100}%` 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}