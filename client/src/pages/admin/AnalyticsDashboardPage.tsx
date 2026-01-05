/**
 * Analytics Dashboard Page
 *
 * Admin page for viewing comprehensive analytics dashboard
 * Provides access to user journey tracking, performance metrics, and engagement analytics
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Alert, AlertDescription, AlertTitle } from '@client/shared/design-system';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Clock,
  Zap
} from 'lucide-react';

import { AnalyticsDashboard } from '@client/features/analytics/ui/dashboard/AnalyticsDashboard';
import { useComprehensiveAnalytics } from '@client/core/analytics/comprehensive-tracker';
import { UserJourneyTracker } from '@client/services/UserJourneyTracker';
import { logger } from '@client/utils/logger';

/**
 * Analytics Dashboard Page Component
 */
export const AnalyticsDashboardPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [journeyAnalytics, setJourneyAnalytics] = useState<any>(null);

  const {
    getDashboardData,
    getMetrics,
    exportData,
    clearData,
    isEnabled,
    setEnabled
  } = useComprehensiveAnalytics();

  const journeyTracker = UserJourneyTracker.getInstance();

  /**
   * Load journey analytics data
   */
  const loadJourneyAnalytics = async () => {
    try {
      const analytics = journeyTracker.getJourneyAnalytics();
      setJourneyAnalytics(analytics);
    } catch (error) {
      logger.error('Failed to load journey analytics', { error });
    }
  };

  /**
   * Handle data export
   */
  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      setIsExporting(true);

      const analyticsData = exportData();
      const journeyData = journeyTracker.exportJourneyData(format);

      const combinedData = {
        analytics: analyticsData,
        journeys: format === 'json' ? JSON.parse(journeyData) : journeyData,
        exportedAt: new Date().toISOString(),
        format
      };

      const blob = new Blob(
        [format === 'json' ? JSON.stringify(combinedData, null, 2) : journeyData],
        { type: format === 'json' ? 'application/json' : 'text/csv' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chanuka-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info('Analytics data exported', { format });
    } catch (error) {
      logger.error('Failed to export analytics data', { error });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle data refresh
   */
  const handleRefresh = async () => {
    try {
      await loadJourneyAnalytics();
      setLastRefresh(new Date());
      logger.info('Analytics data refreshed');
    } catch (error) {
      logger.error('Failed to refresh analytics data', { error });
    }
  };

  /**
   * Handle clear data
   */
  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
      clearData();
      journeyTracker.clearOldJourneys(0); // Clear all journeys
      setJourneyAnalytics(null);
      logger.info('Analytics data cleared');
    }
  };

  /**
   * Load initial data
   */
  useEffect(() => {
    loadJourneyAnalytics();
  }, []);

  const currentMetrics = getMetrics();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-8 w-8" />
            <span>Analytics Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics and user journey tracking for the Chanuka platform
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "Tracking Enabled" : "Tracking Disabled"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnabled(!isEnabled)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {isEnabled ? "Disable" : "Enable"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {!isEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analytics Tracking Disabled</AlertTitle>
          <AlertDescription>
            Analytics tracking is currently disabled. Enable it to start collecting user journey and performance data.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.eventCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Events tracked in current session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.userEngagementCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active user sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Metrics</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.pageMetricsCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Pages with performance data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Journeys</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journeyTracker.getActiveJourneyCount().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Currently active user journeys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Journey Analytics Summary */}
      {journeyAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>User Journey Analytics Summary</CardTitle>
            <CardDescription>
              Overview of user journey patterns and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {journeyAnalytics.totalJourneys.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Journeys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(journeyAnalytics.completionRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(journeyAnalytics.bounceRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Bounce Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(journeyAnalytics.averageTimeSpent / 1000 / 60)}m
                </div>
                <div className="text-sm text-muted-foreground">Avg Time Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Dashboard */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="journeys">User Journeys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Journey Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of user paths and drop-off points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journeyAnalytics ? (
                <div className="space-y-6">
                  {/* Popular Paths */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Popular User Paths</h3>
                    <div className="space-y-2">
                      {journeyAnalytics.popularPaths.slice(0, 5).map((path: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium">
                              {path.path.join(' → ')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {path.frequency} users • {(path.completionRate * 100).toFixed(1)}% completion
                            </div>
                          </div>
                          <Badge variant="outline">
                            {Math.round(path.averageCompletionTime / 1000 / 60)}m avg
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drop-off Points */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Drop-off Points</h3>
                    <div className="space-y-2">
                      {journeyAnalytics.dropOffPoints.slice(0, 5).map((dropOff: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{dropOff.pageId}</div>
                            <div className="text-sm text-muted-foreground">
                              {(dropOff.dropOffRate * 100).toFixed(1)}% drop-off rate
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {Math.round(dropOff.averageTimeBeforeExit / 1000)}s avg time
                            </div>
                            <div className="text-xs text-muted-foreground">
                              before exit
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conversion Funnels */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Conversion Funnels</h3>
                    <div className="space-y-4">
                      {journeyAnalytics.conversionFunnels.map((funnel: any, index: number) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="text-base">{funnel.name}</CardTitle>
                            <CardDescription>
                              {funnel.totalConversions} total conversions
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {funnel.steps.map((step: string, stepIndex: number) => (
                                <div key={stepIndex} className="flex items-center justify-between">
                                  <span className="text-sm">{step}</span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${(funnel.conversionRates[stepIndex] || 0) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium">
                                      {((funnel.conversionRates[stepIndex] || 0) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No journey data available yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Journey data will appear as users navigate through the application.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Settings</CardTitle>
              <CardDescription>
                Configure analytics tracking and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Analytics Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable comprehensive analytics tracking
                  </p>
                </div>
                <Button
                  variant={isEnabled ? "default" : "outline"}
                  onClick={() => setEnabled(!isEnabled)}
                >
                  {isEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Data Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Export or clear analytics data
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('json')}
                      disabled={isExporting}
                    >
                      Export Data
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleClearData}
                    >
                      Clear Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Last Refresh:</strong> {lastRefresh.toLocaleString()}</p>
                  <p><strong>Current Session:</strong> {currentMetrics.eventCount} events tracked</p>
                  <p><strong>Status:</strong> {isEnabled ? "Active tracking" : "Tracking disabled"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboardPage;
