/**
 * Development Monitoring Dashboard
 *
 * Comprehensive monitoring dashboard for the development team
 * Shows performance metrics, regression tests, and system health
 *
 * Requirements: 11.4, 11.5
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Alert, AlertDescription, AlertTitle } from '@client/shared/design-system';
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
  Area,
  AreaChart
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  Settings,
  TrendingDown,
  TrendingUp,
  Zap,
  XCircle
} from 'lucide-react';

import { useRouteProfiler } from './RouteProfiler';
import { performanceRegressionTester } from './PerformanceRegressionTester';
import { logger } from '@client/utils/logger';

/**
 * Color scheme for charts
 */
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  info: '#06b6d4'
};

/**
 * Development Monitoring Dashboard Component
 */
export const DevelopmentMonitoringDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const profiler = useRouteProfiler();
  const [regressionSummary, setRegressionSummary] = useState(performanceRegressionTester.getRegressionSummary());
  const [testResults, setTestResults] = useState(performanceRegressionTester.getTestResults());
  const [baselines, setBaselines] = useState(performanceRegressionTester.getBaselines());

  /**
   * Refresh monitoring data
   */
  const refreshData = () => {
    setRegressionSummary(performanceRegressionTester.getRegressionSummary());
    setTestResults(performanceRegressionTester.getTestResults());
    setBaselines(performanceRegressionTester.getBaselines());
    setLastRefresh(new Date());
  };

  /**
   * Auto-refresh data
   */
  useEffect(() => {
    if (isVisible) {
      refreshData();
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [isVisible]);

  /**
   * Export monitoring data
   */
  const exportData = () => {
    const data = {
      profilerData: profiler.getAllMetrics(),
      regressionData: performanceRegressionTester.exportTestData(),
      exportedAt: new Date()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Clear all monitoring data
   */
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all monitoring data? This action cannot be undone.')) {
      profiler.clearMetrics();
      performanceRegressionTester.clearTestData();
      refreshData();
      logger.info('All monitoring data cleared');
    }
  };

  /**
   * Prepare chart data
   */
  const routePerformanceData = useMemo(() => {
    const data: Array<{ route: string; avgLoadTime: number; avgRenderTime: number; tests: number }> = [];

    Array.from(baselines.entries()).forEach(([route, baseline]) => {
      data.push({
        route: route.length > 15 ? route.substring(0, 15) + '...' : route,
        avgLoadTime: Math.round(baseline.averageLoadTime),
        avgRenderTime: Math.round(baseline.averageRenderTime),
        tests: baseline.sampleCount
      });
    });

    return data;
  }, [baselines]);

  const regressionTrendData = useMemo(() => {
    const last24Hours = testResults.filter(r =>
      new Date(r.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const hourlyData: Record<string, { hour: string; regressions: number; tests: number }> = {};

    last24Hours.forEach(result => {
      const hour = new Date(result.timestamp).getHours();
      const hourKey = `${hour}:00`;

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { hour: hourKey, regressions: 0, tests: 0 };
      }

      hourlyData[hourKey].tests++;
      hourlyData[hourKey].regressions += result.regressions.length;
    });

    return Object.values(hourlyData).sort((a, b) =>
      parseInt(a.hour) - parseInt(b.hour)
    );
  }, [testResults]);

  const severityDistribution = useMemo(() => {
    const data = [
      { name: 'Low', value: regressionSummary.regressionsBySeverity.low, color: COLORS.info },
      { name: 'Medium', value: regressionSummary.regressionsBySeverity.medium, color: COLORS.warning },
      { name: 'High', value: regressionSummary.regressionsBySeverity.high, color: COLORS.danger },
      { name: 'Critical', value: regressionSummary.regressionsBySeverity.critical, color: '#dc2626' }
    ].filter(item => item.value > 0);

    return data;
  }, [regressionSummary]);

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-2"
        title="Toggle Development Monitoring Dashboard"
      >
        <Activity className="h-4 w-4" />
        <span>Dev Monitor</span>
      </button>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="absolute top-12 left-0 w-[800px] bg-white border border-gray-200 rounded-lg shadow-xl max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Development Monitoring</h2>
              <p className="text-sm text-gray-600">Performance metrics and regression testing</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshData}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportData}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllData}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Close"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[500px]">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="regressions">Regressions</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Total Tests</p>
                        <p className="text-lg font-bold">{regressionSummary.totalTests}</p>
                      </div>
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Passed</p>
                        <p className="text-lg font-bold text-green-600">{regressionSummary.passedTests}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Failed</p>
                        <p className="text-lg font-bold text-red-600">{regressionSummary.failedTests}</p>
                      </div>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Regressions</p>
                        <p className="text-lg font-bold text-orange-600">{regressionSummary.totalRegressions}</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  </Card>
                </div>

                {/* Current Route Performance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Current Route Performance</CardTitle>
                    <CardDescription className="text-xs">
                      {profiler.currentRoute}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="font-medium text-blue-700">Active Profiling</div>
                        <div className="text-blue-900">{profiler.isEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-700">Routes Tracked</div>
                        <div className="text-green-900">{profiler.routeMetrics.size}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Alerts */}
                {regressionSummary.totalRegressions > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Performance Regressions Detected</AlertTitle>
                    <AlertDescription>
                      {regressionSummary.totalRegressions} performance regressions found across {Object.keys(regressionSummary.regressionsByRoute).length} routes.
                      Check the Regressions tab for details.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {/* Route Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Route Performance Baselines</CardTitle>
                    <CardDescription className="text-xs">
                      Average load and render times by route
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={routePerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="route" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="avgLoadTime" fill={COLORS.primary} name="Load Time (ms)" />
                          <Bar dataKey="avgRenderTime" fill={COLORS.secondary} name="Render Time (ms)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Component Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Component Performance</CardTitle>
                    <CardDescription className="text-xs">
                      Render times for tracked components
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Array.from(profiler.componentMetrics.entries()).map(([name, metrics]) => (
                        <div key={name} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 truncate flex-1">{name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900">{metrics.renderTime.toFixed(2)}ms</span>
                            <Badge variant="outline" className="text-xs">
                              {metrics.updateCount} updates
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="regressions" className="space-y-4">
                {/* Regression Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Regression Trend (24h)</CardTitle>
                    <CardDescription className="text-xs">
                      Hourly regression count
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={regressionTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="regressions"
                            stroke={COLORS.danger}
                            name="Regressions"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                {severityDistribution.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Regression Severity</CardTitle>
                      <CardDescription className="text-xs">
                        Distribution by severity level
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={severityDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={20}
                              outerRadius={50}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {severityDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center space-x-4 mt-2">
                        {severityDistribution.map((entry) => (
                          <div key={entry.name} className="flex items-center space-x-1 text-xs">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Regressions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Regressions</CardTitle>
                    <CardDescription className="text-xs">
                      Latest performance regressions detected
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {testResults
                        .filter(r => r.regressions.length > 0)
                        .slice(-10)
                        .reverse()
                        .map((result, index) => (
                          <div key={index} className="border border-gray-200 rounded p-2">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <div className="font-medium">{result.routePath}</div>
                                <div className="text-gray-500">
                                  {new Date(result.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <Badge
                                variant={result.regressions.some(r => r.severity === 'critical') ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {result.regressions.length} issues
                              </Badge>
                            </div>
                            <div className="mt-1 space-y-1">
                              {result.regressions.map((regression, rIndex) => (
                                <div key={rIndex} className="text-xs text-gray-600">
                                  {regression.metric}: +{regression.percentageIncrease.toFixed(1)}%
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {regression.severity}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Monitoring Settings</CardTitle>
                    <CardDescription className="text-xs">
                      Configure monitoring and testing parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Route Profiling</div>
                        <div className="text-xs text-gray-600">Enable detailed route performance profiling</div>
                      </div>
                      <Badge variant={profiler.isEnabled ? "default" : "secondary"}>
                        {profiler.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Regression Testing</div>
                        <div className="text-xs text-gray-600">Automated performance regression detection</div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>

                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Actions</div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => profiler.exportMetrics()}
                          className="text-xs"
                        >
                          Export Profiler Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => profiler.clearMetrics()}
                          className="text-xs"
                        >
                          Clear Profiler Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentMonitoringDashboard;
