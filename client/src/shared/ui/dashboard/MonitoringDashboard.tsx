import { Activity, AlertTriangle, CheckCircle, Database, Server, TrendingUp, TrendingDown, Clock, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

import { logger } from '@client/utils/logger';

import { Alert, AlertDescription, AlertTitle } from '../../design-system';
import { Badge } from '../../design-system';
import { Button } from '../../design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../design-system';
import { Progress } from '../../design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../design-system';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  checks: {
    database: { status: 'pass' | 'warn' | 'fail'; message: string; responseTime?: number };
    memory: { status: 'pass' | 'warn' | 'fail'; message: string; usage?: number };
    api: { status: 'pass' | 'warn' | 'fail'; message: string; errorRate?: number };
    errors: { status: 'pass' | 'warn' | 'fail'; message: string; count?: number };
  };
  recommendations: string[];
}

interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connected: boolean;
    responseTime: number;
    activeConnections: number;
    queryStats: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
      errorRate: number;
    };
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    unresolvedErrors: number;
  };
}

interface DashboardData {
  health: SystemHealth;
  metrics: SystemMetrics;
  performance: any;
  errors: any;
  database: any;
}

export function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/monitoring/system/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-50';
      case 'degraded':
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
      case 'fail':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy':
      case 'fail':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { health, metrics } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getStatusIcon(health.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge className={getStatusColor(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Score: {health.score}/100
            </p>
            <Progress value={health.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(metrics.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.api.requestsPerMinute.toFixed(1)}/min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.errors.totalErrors} total errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Health Checks</CardTitle>
          <CardDescription>
            Detailed system component health status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="flex items-center space-x-2">
                <div className={`p-2 rounded-full ${getStatusColor(check.status)}`}>
                  {getStatusIcon(check.status)}
                </div>
                <div>
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-sm text-muted-foreground">{check.message}</div>
                  {'responseTime' in check && check.responseTime && (
                    <div className="text-xs text-muted-foreground">
                      {check.responseTime.toFixed(0)}ms
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {health.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Response Time</span>
                  <span className="font-mono">{metrics.api.averageResponseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests per Minute</span>
                  <span className="font-mono">{metrics.api.requestsPerMinute.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-mono">{metrics.api.errorRate.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>CPU Usage</span>
                  <span className="font-mono">{metrics.cpu.usage.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Usage</span>
                  <span className="font-mono">{metrics.memory.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.memory.percentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Connection Status</span>
                  <Badge className={getStatusColor(metrics.database.connected ? 'pass' : 'fail')}>
                    {metrics.database.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Response Time</span>
                  <span className="font-mono">{metrics.database.responseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Connections</span>
                  <span className="font-mono">{metrics.database.activeConnections}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Queries</span>
                  <span className="font-mono">{metrics.database.queryStats.totalQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Query Time</span>
                  <span className="font-mono">{metrics.database.queryStats.averageQueryTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Slow Queries</span>
                  <span className="font-mono">{metrics.database.queryStats.slowQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-mono">{metrics.database.queryStats.errorRate.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Used Memory</span>
                <span className="font-mono">{formatBytes(metrics.memory.used)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Memory</span>
                <span className="font-mono">{formatBytes(metrics.memory.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Heap Used</span>
                <span className="font-mono">{formatBytes(metrics.memory.heapUsed)}</span>
              </div>
              <div className="flex justify-between">
                <span>Heap Total</span>
                <span className="font-mono">{formatBytes(metrics.memory.heapTotal)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{metrics.memory.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.memory.percentage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Errors</span>
                  <span className="font-mono">{metrics.errors.totalErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-mono">{metrics.errors.errorRate.toFixed(2)}/min</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Errors</span>
                  <span className="font-mono text-red-600">{metrics.errors.criticalErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unresolved Errors</span>
                  <span className="font-mono">{metrics.errors.unresolvedErrors}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  View Error Patterns
                </Button>
                <Button variant="outline" className="w-full">
                  View Recent Errors
                </Button>
                <Button variant="outline" className="w-full">
                  Configure Alerts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

