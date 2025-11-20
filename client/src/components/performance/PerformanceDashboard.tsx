import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import { useWebVitals, usePerformanceBudget } from '@client/hooks/use-web-vitals';
import { performanceMonitoring } from '@client/services/performance-monitoring';
import type { WebVitalsMetrics } from '@client/hooks/use-web-vitals';

interface PerformanceViolation {
  metric: string;
  value: number;
  budget: number;
  severity: 'warning' | 'error';
}

interface MetricCardProps {
  title: string;
  value: number | undefined;
  unit: string;
  threshold: number;
  description: string;
  status: 'good' | 'needs-improvement' | 'poor' | 'unknown';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  threshold,
  description,
  status
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'needs-improvement': return <AlertTriangle className="h-4 w-4" />;
      case 'poor': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    if (unit === 'score') return value.toFixed(1);
    return `${value.toFixed(0)}${unit}`;
  };

  return (
    <Card className={`transition-all duration-200 ${getStatusColor(status)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {getStatusIcon(status)}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Threshold: {threshold}{unit}
        </div>
        {value !== undefined && (
          <Progress
            value={Math.min((value / threshold) * 100, 100)}
            className="mt-2 h-1"
          />
        )}
      </CardContent>
    </Card>
  );
};

interface ViolationAlertProps {
  violations: PerformanceViolation[];
}

const ViolationAlert: React.FC<ViolationAlertProps> = ({ violations }) => {
  if (violations.length === 0) return null;

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">Performance Budget Violations</AlertTitle>
      <AlertDescription className="text-red-700">
        <ul className="list-disc list-inside mt-2 space-y-1">
          {violations.map((violation, index) => (
            <li key={index} className="text-sm">
              <strong>{violation.metric}:</strong> {violation.value.toFixed(2)}
              {' '}exceeds threshold of {violation.budget}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const { metrics, isComplete } = useWebVitals({
    enabled: true,
    onAllMetrics: (metrics) => {
      performanceMonitoring.recordWebVitals(metrics);
    }
  });

  const { violations, hasViolations } = usePerformanceBudget({
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 800
  });

  const [report, setReport] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setIsRefreshing(true);
    try {
      const performanceReport = performanceMonitoring.generateReport();
      setReport(performanceReport);
    } catch (error) {
      console.error('Failed to load performance report:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getMetricStatus = (metric: keyof WebVitalsMetrics, value: number | undefined): 'good' | 'needs-improvement' | 'poor' | 'unknown' => {
    if (value === undefined) return 'unknown';

    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const exportReport = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `performance-report-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor Core Web Vitals and performance budgets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReport}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportReport}
            disabled={!report}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {hasViolations && <ViolationAlert violations={violations} />}

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="budget">Performance Budget</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Largest Contentful Paint"
              value={metrics.lcp}
              unit="ms"
              threshold={2500}
              description="Measures loading performance"
              status={getMetricStatus('lcp', metrics.lcp)}
            />
            <MetricCard
              title="First Input Delay"
              value={metrics.fid}
              unit="ms"
              threshold={100}
              description="Measures interactivity"
              status={getMetricStatus('fid', metrics.fid)}
            />
            <MetricCard
              title="Cumulative Layout Shift"
              value={metrics.cls}
              unit=""
              threshold={0.1}
              description="Measures visual stability"
              status={getMetricStatus('cls', metrics.cls)}
            />
            <MetricCard
              title="First Contentful Paint"
              value={metrics.fcp}
              unit="ms"
              threshold={1800}
              description="Measures loading performance"
              status={getMetricStatus('fcp', metrics.fcp)}
            />
            <MetricCard
              title="Time to First Byte"
              value={metrics.ttfb}
              unit="ms"
              threshold={800}
              description="Measures server response time"
              status={getMetricStatus('ttfb', metrics.ttfb)}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Collection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={isComplete ? "default" : "secondary"}>
                    {isComplete ? 'Complete' : 'Collecting...'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isComplete
                    ? 'All Core Web Vitals metrics have been collected'
                    : 'Waiting for all metrics to be collected'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance Budget Status
              </CardTitle>
              <CardDescription>
                Current status against defined performance budgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Health Score</span>
                    <Badge variant={report.healthScore >= 80 ? "default" : report.healthScore >= 60 ? "secondary" : "destructive"}>
                      {report.healthScore}/100
                    </Badge>
                  </div>
                  <Progress value={report.healthScore} className="h-2" />

                  {report.recommendations && report.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recommendations</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {report.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No performance report available</p>
                  <Button onClick={loadReport} className="mt-4" disabled={isRefreshing}>
                    Generate Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Trends
              </CardTitle>
              <CardDescription>
                Historical performance data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Trend analysis coming soon</p>
                <p className="text-sm mt-2">
                  Historical data collection and trend analysis will be available in future updates
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
