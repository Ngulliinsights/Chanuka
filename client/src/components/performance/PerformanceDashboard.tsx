import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  Wifi, 
  Download, 
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  performanceMonitor, 
  performanceBudget, 
  usePerformanceMonitoring 
} from '@/utils/performanceMonitoring';
import { useConnectionAwareLoading } from '@/utils/connectionAwareLoading';
import { cn } from '@/lib/utils';
import { logger } from '../utils/logger.js';

export interface PerformanceDashboardProps {
  className?: string;
  showDetails?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className,
  showDetails = false,
}) => {
  const { getCoreWebVitals, getPerformanceScore, getMetrics } = usePerformanceMonitoring();
  const { strategy, connectionInfo } = useConnectionAwareLoading();
  const [budgetCheck, setBudgetCheck] = useState(performanceBudget.checkBudget());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBudgetCheck(performanceBudget.checkBudget());
      setRefreshKey(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const coreWebVitals = getCoreWebVitals();
  const performanceScore = getPerformanceScore();
  const metrics = getMetrics();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Performance Score Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
          <div className="flex items-center space-x-2">
            {getScoreIcon(performanceScore)}
            <span className={cn('text-2xl font-bold', getScoreColor(performanceScore))}>
              {performanceScore}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={performanceScore} className="w-full" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on Core Web Vitals and performance metrics
          </p>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LCP</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coreWebVitals.lcp ? formatTime(coreWebVitals.lcp) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Largest Contentful Paint
            </p>
            <Badge 
              variant={
                !coreWebVitals.lcp ? 'secondary' :
                coreWebVitals.lcp <= 2500 ? 'default' :
                coreWebVitals.lcp <= 4000 ? 'secondary' : 'destructive'
              }
              className="mt-1"
            >
              {!coreWebVitals.lcp ? 'Measuring' :
               coreWebVitals.lcp <= 2500 ? 'Good' :
               coreWebVitals.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FID</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coreWebVitals.fid ? formatTime(coreWebVitals.fid) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              First Input Delay
            </p>
            <Badge 
              variant={
                !coreWebVitals.fid ? 'secondary' :
                coreWebVitals.fid <= 100 ? 'default' :
                coreWebVitals.fid <= 300 ? 'secondary' : 'destructive'
              }
              className="mt-1"
            >
              {!coreWebVitals.fid ? 'Measuring' :
               coreWebVitals.fid <= 100 ? 'Good' :
               coreWebVitals.fid <= 300 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CLS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coreWebVitals.cls ? coreWebVitals.cls.toFixed(3) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Cumulative Layout Shift
            </p>
            <Badge 
              variant={
                !coreWebVitals.cls ? 'secondary' :
                coreWebVitals.cls <= 0.1 ? 'default' :
                coreWebVitals.cls <= 0.25 ? 'secondary' : 'destructive'
              }
              className="mt-1"
            >
              {!coreWebVitals.cls ? 'Measuring' :
               coreWebVitals.cls <= 0.1 ? 'Good' :
               coreWebVitals.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Connection Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
          <Wifi className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium">Type</p>
              <p className="text-2xl font-bold">{connectionInfo.effectiveType.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Downlink</p>
              <p className="text-2xl font-bold">{connectionInfo.downlink.toFixed(1)} Mbps</p>
            </div>
            <div>
              <p className="text-sm font-medium">RTT</p>
              <p className="text-2xl font-bold">{connectionInfo.rtt}ms</p>
            </div>
            <div>
              <p className="text-sm font-medium">Data Saver</p>
              <p className="text-2xl font-bold">{connectionInfo.saveData ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bundle Sizes */}
      {showDetails && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bundle Sizes</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">JavaScript</p>
                <p className="text-2xl font-bold">
                  {metrics.totalJSSize ? formatBytes(metrics.totalJSSize) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">CSS</p>
                <p className="text-2xl font-bold">
                  {metrics.totalCSSSize ? formatBytes(metrics.totalCSSSize) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Images</p>
                <p className="text-2xl font-bold">
                  {metrics.totalImageSize ? formatBytes(metrics.totalImageSize) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Budget */}
      {showDetails && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Budget</CardTitle>
            <div className="flex items-center space-x-2">
              {budgetCheck.passed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <Badge variant={budgetCheck.passed ? 'default' : 'destructive'}>
                {budgetCheck.passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {budgetCheck.violations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">Budget Violations:</p>
                <ul className="text-sm space-y-1">
                  {budgetCheck.violations.map((violation, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span>{violation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {budgetCheck.passed && (
              <p className="text-sm text-green-600">All performance budgets are within limits.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Strategy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loading Strategy</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Image Quality</p>
              <p>{strategy.imageQuality}%</p>
            </div>
            <div>
              <p className="font-medium">Preloading</p>
              <p>{strategy.enablePreloading ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <p className="font-medium">Lazy Threshold</p>
              <p>{(strategy.lazyLoadThreshold * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="font-medium">Cache Strategy</p>
              <p className="capitalize">{strategy.cacheStrategy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = performanceMonitor.exportMetrics();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-metrics-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Metrics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshKey(prev => prev + 1);
                  setBudgetCheck(performanceBudget.checkBudget());
                }}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Compact performance indicator for header/footer
export const PerformanceIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { getPerformanceScore } = usePerformanceMonitoring();
  const score = getPerformanceScore();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Activity className="h-4 w-4 text-muted-foreground" />
      <span className={cn('text-sm font-medium', getScoreColor(score))}>
        {score}
      </span>
    </div>
  );
};

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}