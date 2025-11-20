/**
 * SearchAnalyticsDashboard Component
 *
 * Admin dashboard for search analytics with performance metrics,
 * popular searches, user behavior insights, and health monitoring.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Search,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface SearchAnalyticsData {
  overview: {
    totalSearches: number;
    uniqueUsers: number;
    averageResponseTime: number;
    successRate: number;
    period: string;
  };
  popularQueries: Array<{
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }>;
  performance: {
    engineMetrics: {
      postgresql: {
        avgTime: number;
        successRate: number;
        usage: number;
      };
      fuse: {
        avgTime: number;
        successRate: number;
        usage: number;
      };
    };
    responseTimeDistribution: {
      fast: number; // < 100ms
      medium: number; // 100-500ms
      slow: number; // > 500ms
    };
  };
  userBehavior: {
    noResultsQueries: string[];
    abandonedSearches: number;
    clickThroughRate: number;
    averageSessionDuration: number;
  };
  health: {
    indexHealth: 'healthy' | 'warning' | 'critical';
    lastRebuild: string;
    errorRate: number;
    cacheHitRate: number;
  };
}

interface SearchAnalyticsDashboardProps {
  className?: string;
  onExport?: (format: 'csv' | 'json') => void;
  onRefresh?: () => void;
}

export function SearchAnalyticsDashboard({
  className = '',
  onExport,
  onRefresh
}: SearchAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data - in real implementation, this would come from API
  const analyticsData: SearchAnalyticsData = {
    overview: {
      totalSearches: 15420,
      uniqueUsers: 3240,
      averageResponseTime: 245,
      successRate: 94.2,
      period: 'Last 7 days'
    },
    popularQueries: [
      { query: 'healthcare reform', count: 1250, trend: 'up', percentage: 8.1 },
      { query: 'climate change', count: 980, trend: 'stable', percentage: 6.4 },
      { query: 'education funding', count: 875, trend: 'up', percentage: 5.7 },
      { query: 'tax policy', count: 720, trend: 'down', percentage: 4.7 },
      { query: 'infrastructure', count: 650, trend: 'up', percentage: 4.2 }
    ],
    performance: {
      engineMetrics: {
        postgresql: {
          avgTime: 180,
          successRate: 96.5,
          usage: 65
        },
        fuse: {
          avgTime: 45,
          successRate: 98.2,
          usage: 35
        }
      },
      responseTimeDistribution: {
        fast: 68,
        medium: 25,
        slow: 7
      }
    },
    userBehavior: {
      noResultsQueries: [
        'xyz123',
        'nonexistent bill',
        'random text search'
      ],
      abandonedSearches: 1250,
      clickThroughRate: 72.5,
      averageSessionDuration: 185
    },
    health: {
      indexHealth: 'healthy',
      lastRebuild: '2025-11-17T08:00:00Z',
      errorRate: 2.1,
      cacheHitRate: 78.5
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh?.();
      toast({
        title: "Data Refreshed",
        description: "Search analytics have been updated."
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh analytics data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    onExport?.(format);
    toast({
      title: "Export Started",
      description: `Exporting analytics data as ${format.toUpperCase()}.`
    });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Search Analytics</h1>
          <p className="text-muted-foreground">
            Monitor search performance and user behavior
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Searches</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalSearches.toLocaleString()}</p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold">{analyticsData.overview.uniqueUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{analyticsData.overview.averageResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{analyticsData.overview.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="popular" className="space-y-4">
        <TabsList>
          <TabsTrigger value="popular">Popular Searches</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="behavior">User Behavior</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Search Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.popularQueries.map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">"{query.query}"</p>
                        <p className="text-sm text-muted-foreground">
                          {query.count.toLocaleString()} searches ({query.percentage}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(query.trend)}
                      <Badge variant="outline">
                        {query.trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Engine Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analyticsData.performance.engineMetrics).map(([engine, metrics]) => (
                  <div key={engine} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{engine}</span>
                      <Badge variant="outline">{metrics.usage}% usage</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>
                        <span className="ml-2 font-medium">{metrics.avgTime}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="ml-2 font-medium">{metrics.successRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" dangerouslySetInnerHTML={{ __html: 'Fast < 100ms' }} />
                    <span className="font-medium">{analyticsData.performance.responseTimeDistribution.fast}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${analyticsData.performance.responseTimeDistribution.fast}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium (100-500ms)</span>
                    <span className="font-medium">{analyticsData.performance.responseTimeDistribution.medium}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${analyticsData.performance.responseTimeDistribution.medium}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm" dangerouslySetInnerHTML={{ __html: 'Slow > 500ms' }} />
                    <span className="font-medium">{analyticsData.performance.responseTimeDistribution.slow}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${analyticsData.performance.responseTimeDistribution.slow}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Behavior Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Click-through Rate</span>
                  <span className="font-medium">{analyticsData.userBehavior.clickThroughRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Session Duration</span>
                  <span className="font-medium">{analyticsData.userBehavior.averageSessionDuration}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Abandoned Searches</span>
                  <span className="font-medium">{analyticsData.userBehavior.abandonedSearches.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>No Results Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.userBehavior.noResultsQueries.map((query, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 rounded bg-muted">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <code className="text-sm">"{query}"</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Index Health</span>
                  <Badge className={getHealthStatusColor(analyticsData.health.indexHealth)}>
                    {analyticsData.health.indexHealth}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error Rate</span>
                  <span className="font-medium">{analyticsData.health.errorRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Hit Rate</span>
                  <span className="font-medium">{analyticsData.health.cacheHitRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Index Rebuild</span>
                  <span className="font-medium text-sm">
                    {new Date(analyticsData.health.lastRebuild).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rebuild Search Indexes
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Performance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Search Cache
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SearchAnalyticsDashboard;