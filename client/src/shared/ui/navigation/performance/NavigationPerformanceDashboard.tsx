/**
 * Navigation Performance Dashboard
 * 
 * Real-time monitoring and analytics dashboard for navigation performance.
 * Implements Phase 2 recommendations for navigation monitoring.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { navigationUtils } from '@client/utils/navigation';
import { logger } from '@client/utils/logger';
import { BarChart3, Clock, Users, Search, TrendingUp, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  averageNavigationTime: number;
  totalPageViews: number;
  uniqueUsers: number;
  searchQueries: number;
  errorRate: number;
  cacheHitRate: number;
  mostVisitedPages: Array<{ path: string; views: number }>;
  slowestPages: Array<{ path: string; loadTime: number }>;
  searchTerms: Array<{ term: string; count: number }>;
}

interface NavigationPerformanceDashboardProps {
  refreshInterval?: number;
  showRealTime?: boolean;
}

export function NavigationPerformanceDashboard({
  refreshInterval = 5000,
  showRealTime = true
}: NavigationPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageNavigationTime: 0,
    totalPageViews: 0,
    uniqueUsers: 0,
    searchQueries: 0,
    errorRate: 0,
    cacheHitRate: 0,
    mostVisitedPages: [],
    slowestPages: [],
    searchTerms: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch performance metrics
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);

      // Simulate fetching metrics from analytics service
      // In a real app, this would call your analytics API
      const mockMetrics: PerformanceMetrics = {
        averageNavigationTime: Math.random() * 1000 + 200,
        totalPageViews: Math.floor(Math.random() * 10000) + 5000,
        uniqueUsers: Math.floor(Math.random() * 1000) + 500,
        searchQueries: Math.floor(Math.random() * 500) + 100,
        errorRate: Math.random() * 5,
        cacheHitRate: Math.random() * 30 + 70,
        mostVisitedPages: [
          { path: '/dashboard', views: 1250 },
          { path: '/bills', views: 980 },
          { path: '/community', views: 750 },
          { path: '/search', views: 620 },
          { path: '/profile', views: 450 }
        ],
        slowestPages: [
          { path: '/analytics', loadTime: 2400 },
          { path: '/reports', loadTime: 1800 },
          { path: '/dashboard', loadTime: 1200 },
          { path: '/bills/detail', loadTime: 900 },
          { path: '/community/feed', loadTime: 700 }
        ],
        searchTerms: [
          { term: 'healthcare', count: 45 },
          { term: 'education', count: 38 },
          { term: 'budget', count: 32 },
          { term: 'infrastructure', count: 28 },
          { term: 'environment', count: 24 }
        ]
      };

      setMetrics(mockMetrics);
      setLastUpdated(new Date());
      
      logger.info('Navigation performance metrics updated', mockMetrics);
    } catch (error) {
      logger.error('Failed to fetch navigation performance metrics', { error });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh metrics
  useEffect(() => {
    fetchMetrics();
    
    if (showRealTime) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, showRealTime]);

  // Performance status calculation
  const performanceStatus = useMemo(() => {
    const { averageNavigationTime, errorRate, cacheHitRate } = metrics;
    
    if (averageNavigationTime > 1000 || errorRate > 3 || cacheHitRate < 60) {
      return { status: 'poor', color: 'destructive' };
    } else if (averageNavigationTime > 500 || errorRate > 1 || cacheHitRate < 80) {
      return { status: 'fair', color: 'warning' };
    } else {
      return { status: 'excellent', color: 'success' };
    }
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Navigation Performance</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of navigation system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={performanceStatus.color as any}>
            {performanceStatus.status.toUpperCase()}
          </Badge>
          <Button onClick={fetchMetrics} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Navigation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageNavigationTime.toFixed(0)}ms
            </div>
            <Progress 
              value={Math.max(0, 100 - (metrics.averageNavigationTime / 10))} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalPageViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <Progress value={metrics.cacheHitRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.errorRate.toFixed(2)}%
            </div>
            <Progress 
              value={Math.max(0, 100 - (metrics.errorRate * 20))} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pages">Popular Pages</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="search">Search Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Visited Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.mostVisitedPages.map((page, index) => (
                  <div key={page.path} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{page.path}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {page.views.toLocaleString()} views
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slowest Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.slowestPages.map((page, index) => (
                  <div key={page.path} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={page.loadTime > 1500 ? 'destructive' : 'secondary'}>
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{page.path}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {page.loadTime}ms
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.searchTerms.map((term, index) => (
                  <div key={term.term} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{term.term}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {term.count} searches
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleTimeString()}
        {showRealTime && ` • Auto-refresh every ${refreshInterval / 1000}s`}
      </div>
    </div>
  );
}

export default NavigationPerformanceDashboard;