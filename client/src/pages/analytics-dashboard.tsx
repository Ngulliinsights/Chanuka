/**
 * Analytics Dashboard Page
 * 
 * Comprehensive analytics including:
 * - User engagement metrics
 * - Journey analysis
 * - Real-time engagement data
 * - Community insights
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { EngagementDashboard } from '@client/features/analytics/ui/engagement-dashboard';
import { JourneyAnalyticsDashboard } from '@client/features/analytics/ui/JourneyAnalyticsDashboard';
import { RealTimeEngagementDashboard } from '@client/features/analytics/ui/real-time-engagement-dashboard';
import { ErrorBoundary } from '@client/core/error/components/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system/primitives/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import { Badge } from '@client/shared/design-system/primitives/badge';
import { Button } from '@client/shared/design-system/primitives/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  Download, 
  RefreshCw,
  Eye,
  Target,
  Zap
} from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Export analytics data
    const data = {
      timestamp: new Date().toISOString(),
      type: 'analytics_export',
      data: 'Analytics data would be exported here'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard - Chanuka Platform</title>
        <meta 
          name="description" 
          content="Comprehensive analytics dashboard with user engagement, journey analysis, and real-time metrics." 
        />
      </Helmet>

      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                  <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
                  Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive insights into user engagement and platform performance
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Key Metrics Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68.4%</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +5.2% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45.2K</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +18% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.2%</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +0.8% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Analytics Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="engagement" className="flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Engagement
                </TabsTrigger>
                <TabsTrigger value="journey" className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  User Journey
                </TabsTrigger>
                <TabsTrigger value="realtime" className="flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Real-time
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Usage Trends</CardTitle>
                      <CardDescription>
                        Overview of platform usage patterns and growth metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Usage trends visualization</p>
                        <p className="text-sm mt-2">
                          Interactive charts showing user growth and engagement patterns
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Content</CardTitle>
                      <CardDescription>
                        Most viewed and engaged content on the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Bill Analysis Dashboard</span>
                          <Badge variant="secondary">1,247 views</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Community Discussions</span>
                          <Badge variant="secondary">892 views</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Expert Verification</span>
                          <Badge variant="secondary">634 views</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Civic Education</span>
                          <Badge variant="secondary">521 views</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-6">
                <EngagementDashboard />
              </TabsContent>

              <TabsContent value="journey" className="space-y-6">
                <JourneyAnalyticsDashboard />
              </TabsContent>

              <TabsContent value="realtime" className="space-y-6">
                <RealTimeEngagementDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
}