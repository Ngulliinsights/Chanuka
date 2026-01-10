/**
 * Analytics Dashboard Component
 *
 * Comprehensive analytics dashboard for monitoring user engagement across all personas
 * Displays real-time metrics, performance data, and alerts
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import {
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  Eye,
  MousePointer,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
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
  AreaChart,
} from 'recharts';

import {
  ComprehensiveAnalyticsTracker,
  AnalyticsDashboardData,
} from '@client/core/analytics/comprehensive-tracker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Alert, AlertDescription, AlertTitle } from '@client/shared/design-system';
import { logger } from '@client/shared/utils/logger';

import { useAnalyticsDashboard } from '@client/shared/hooks/useAnalytics';

/**
 * Color scheme for charts and visualizations
 */
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  info: '#06b6d4',
  personas: {
    public: '#6b7280',
    citizen: '#3b82f6',
    expert: '#10b981',
    admin: '#f59e0b',
  },
};

/**
 * Metric card component for displaying key statistics
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  description,
  trend,
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingUp className="h-4 w-4 rotate-180" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}
              {change}%
            </span>
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

/**
 * Alert component for displaying system alerts
 */
interface AlertItemProps {
  alert: AnalyticsDashboardData['alerts'][0];
  onAcknowledge: (alertId: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge }) => {
  const getAlertVariant = () => {
    switch (alert.severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAlertIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Alert variant={getAlertVariant()}>
      {getAlertIcon()}
      <AlertTitle className="flex items-center justify-between">
        <span>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert</span>
        <Badge variant="outline" className="ml-2">
          {alert.severity}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{alert.message}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{alert.timestamp.toLocaleString()}</span>
          {!alert.acknowledged && (
            <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
              Acknowledge
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Performance metrics chart component
 */
interface PerformanceChartProps {
  data: Array<{
    name: string;
    loadTime: number;
    fcp: number;
    lcp: number;
    cls: number;
  }>;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="loadTime" stroke={COLORS.primary} name="Load Time (ms)" />
        <Line type="monotone" dataKey="fcp" stroke={COLORS.secondary} name="FCP (ms)" />
        <Line type="monotone" dataKey="lcp" stroke={COLORS.warning} name="LCP (ms)" />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Persona breakdown chart component
 */
interface PersonaChartProps {
  data: Array<{
    name: string;
    users: number;
    engagement: number;
    conversions: number;
  }>;
}

const PersonaChart: React.FC<PersonaChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="users" fill={COLORS.primary} name="Users" />
        <Bar dataKey="engagement" fill={COLORS.secondary} name="Avg Engagement" />
        <Bar dataKey="conversions" fill={COLORS.warning} name="Conversions" />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Real-time activity component
 */
interface RealTimeActivityProps {
  data: AnalyticsDashboardData['realTimeData'];
}

const RealTimeActivity: React.FC<RealTimeActivityProps> = ({ data }) => {
  const getSystemHealthColor = () => {
    switch (data.systemHealth) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSystemHealthIcon = () => {
    switch (data.systemHealth) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Health</h3>
        <div className={`flex items-center space-x-2 ${getSystemHealthColor()}`}>
          {getSystemHealthIcon()}
          <span className="font-medium capitalize">{data.systemHealth}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePages.length}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Recent Events</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {data.recentEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
            >
              <span className="font-medium">{event.type.replace('_', ' ')}</span>
              <span className="text-muted-foreground">{event.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Active Pages</h4>
        <div className="space-y-1">
          {data.activePages.slice(0, 5).map((page, index) => (
            <div key={index} className="text-xs p-1 bg-gray-50 rounded">
              {page}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main Analytics Dashboard Component
 */
export const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const analyticsTracker = useMemo(() => ComprehensiveAnalyticsTracker.getInstance(), []);

  /**
   * Load dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsTracker.getAnalyticsDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      logger.error('Failed to load analytics dashboard data', { error: err });
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle alert acknowledgment
   */
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // Update local state immediately for better UX
      if (dashboardData) {
        const updatedAlerts = dashboardData.alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        );
        setDashboardData({
          ...dashboardData,
          alerts: updatedAlerts,
        });
      }

      // TODO: Send acknowledgment to server
      logger.info('Alert acknowledged', { alertId });
    } catch (err) {
      logger.error('Failed to acknowledge alert', { error: err, alertId });
    }
  };

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    loadDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  /**
   * Prepare chart data
   */
  const personaChartData = useMemo(() => {
    if (!dashboardData) return [];

    return Object.entries(dashboardData.personaBreakdown).map(([role, data]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      users: data.userCount,
      engagement: Math.round(data.averageEngagement),
      conversions: Math.round(data.conversionRate * 100),
    }));
  }, [dashboardData]);

  const performanceChartData = useMemo(() => {
    if (!dashboardData) return [];

    // Mock performance data over time - in real implementation, this would come from historical data
    return [
      { name: '1h ago', loadTime: 2100, fcp: 1200, lcp: 2000, cls: 0.1 },
      { name: '45m ago', loadTime: 2300, fcp: 1300, lcp: 2200, cls: 0.12 },
      { name: '30m ago', loadTime: 1900, fcp: 1100, lcp: 1800, cls: 0.08 },
      { name: '15m ago', loadTime: 2000, fcp: 1150, lcp: 1900, cls: 0.09 },
      {
        name: 'Now',
        loadTime: dashboardData.performanceMetrics.averageLoadTime,
        fcp: 1100,
        lcp: 1850,
        cls: 0.07,
      },
    ];
  }, [dashboardData]);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={loadDashboardData} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and monitoring across all user personas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh
          </Button>
          <Badge variant="outline">Last updated: {new Date().toLocaleTimeString()}</Badge>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={dashboardData.overview.totalUsers.toLocaleString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="All registered users"
        />
        <MetricCard
          title="Active Users"
          value={dashboardData.overview.activeUsers.toLocaleString()}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description="Users active in last 30 minutes"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${Math.round(dashboardData.overview.averageSessionDuration / 60)}m`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Average time per session"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${(dashboardData.overview.conversionRate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          description="Users completing key actions"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Load Time"
          value={`${dashboardData.performanceMetrics.averageLoadTime}ms`}
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
          description="Average page load time"
        />
        <MetricCard
          title="Core Web Vitals"
          value={dashboardData.performanceMetrics.coreWebVitalsScore}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
          description="Overall performance score"
        />
        <MetricCard
          title="Error Rate"
          value={`${(dashboardData.performanceMetrics.errorRate * 100).toFixed(2)}%`}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          description="Percentage of requests with errors"
        />
        <MetricCard
          title="Performance Issues"
          value={dashboardData.performanceMetrics.performanceIssues}
          icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
          description="Issues detected in last hour"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {dashboardData.alerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {dashboardData.alerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Engagement by Persona</CardTitle>
                <CardDescription>
                  User count, engagement score, and conversion rate by user type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonaChart data={personaChartData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Page load time and Core Web Vitals over time</CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceChart data={performanceChartData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(dashboardData.personaBreakdown).map(([role, data]) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{role.charAt(0).toUpperCase() + role.slice(1)} Users</span>
                    <Badge
                      style={{
                        backgroundColor: COLORS.personas[role as keyof typeof COLORS.personas],
                      }}
                    >
                      {data.userCount}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Engagement</p>
                      <p className="text-2xl font-bold">{data.averageEngagement.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold">
                        {(data.conversionRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Top Pages</p>
                    <div className="space-y-1">
                      {data.topPages.slice(0, 3).map((page, index) => (
                        <div key={index} className="text-xs p-1 bg-gray-50 rounded">
                          {page}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Over Time</CardTitle>
              <CardDescription>
                Detailed performance metrics including load times and Core Web Vitals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={performanceChartData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Load Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Good (&lt;2.5s)</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Core Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>LCP</span>
                    <span className="text-green-600">Good</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>FID</span>
                    <span className="text-green-600">Good</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>CLS</span>
                    <span className="text-yellow-600">Needs Improvement</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>JavaScript Errors</span>
                    <span>12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Network Errors</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>API Errors</span>
                    <span>1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Activity</CardTitle>
              <CardDescription>Current system status and live user activity</CardDescription>
            </CardHeader>
            <CardContent>
              <RealTimeActivity data={dashboardData.realTimeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">System Alerts</h2>
            <Badge variant="outline">
              {dashboardData.alerts.filter(a => !a.acknowledged).length} unacknowledged
            </Badge>
          </div>

          <div className="space-y-4">
            {dashboardData.alerts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No alerts at this time</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              dashboardData.alerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledgeAlert} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
