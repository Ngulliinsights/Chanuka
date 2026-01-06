/**
 * Performance Monitor Component
 *
 * Real-time performance monitoring for client architecture refinement.
 * Tracks page load times, Core Web Vitals, and optimization opportunities.
 *
 * Requirements: 9.1, 9.2
 */

import { usePerformanceBenchmarking } from '@client/utils/performance-benchmarking';
import { performanceMonitor } from '@client/utils/performance-monitor';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { logger } from '@client/utils/logger';

// Temporarily unused - TODO: Implement performance benchmarking
// const performanceBenchmarking = usePerformanceBenchmarking();

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
}

interface PerformanceThresholds {
  loadTime: number;
  lcp: number;
  fid: number;
  cls: number;
}

interface PerformanceMonitorProps {
  pageName: string;
  thresholds?: Partial<PerformanceThresholds>;
  showRealTime?: boolean;
  showOptimizations?: boolean;
  onOptimizationNeeded?: (issues: string[]) => void;
}

const DEFAULT_THRESHOLDS: Record<string, PerformanceThresholds> = {
  home: {
    loadTime: 2000, // 2 seconds
    lcp: 2500,
    fid: 100,
    cls: 0.1,
  },
  search: {
    loadTime: 500, // 500ms for search results
    lcp: 1000,
    fid: 50,
    cls: 0.05,
  },
  dashboard: {
    loadTime: 3000, // 3 seconds with full data
    lcp: 3000,
    fid: 100,
    cls: 0.1,
  },
  default: {
    loadTime: 2000,
    lcp: 2500,
    fid: 100,
    cls: 0.1,
  },
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  pageName,
  thresholds: customThresholds,
  showRealTime = true,
  showOptimizations = true,
  onOptimizationNeeded,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const thresholds = {
    ...(DEFAULT_THRESHOLDS[pageName] || DEFAULT_THRESHOLDS.default),
    ...customThresholds,
  };

  const { benchmark, isRunning, runBenchmark, optimize } = usePerformanceBenchmarking(
    pageName,
    false
  );

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    performanceMonitor.startMonitoring(pageName);

    // Monitor Core Web Vitals
    performanceMonitor.monitorWebVitals(vitals => {
      setMetrics(prev =>
        prev
          ? {
              ...prev,
              coreWebVitals: {
                lcp: vitals.lcp || prev.coreWebVitals.lcp,
                fid: vitals.fid || prev.coreWebVitals.fid,
                cls: vitals.cls || prev.coreWebVitals.cls,
              },
            }
          : null
      );
    });

    logger.info(`Performance monitoring started for ${pageName}`);
  }, [pageName]);

  /**
   * Stop performance monitoring and collect metrics
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    const performanceMetrics = performanceMonitor.endMonitoring(pageName);
    const memoryUsage =
      'memory' in performance ? (performance as any).memory?.usedJSHeapSize || 0 : 0;

    const collectedMetrics: PerformanceMetrics = {
      loadTime: Math.round(performanceMetrics.loadTime),
      renderTime: Math.round(performanceMetrics.renderTime),
      interactionTime: Math.round(performanceMetrics.interactionTime || 0),
      memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
      coreWebVitals: {
        lcp: 0,
        fid: 0,
        cls: 0,
      },
    };

    setMetrics(collectedMetrics);
    setIsMonitoring(false);

    // Analyze performance issues
    const detectedIssues = analyzePerformanceIssues(collectedMetrics, thresholds);
    setIssues(detectedIssues);

    if (detectedIssues.length > 0 && onOptimizationNeeded) {
      onOptimizationNeeded(detectedIssues);
    }

    logger.info(`Performance monitoring completed for ${pageName}`, {
      metrics: collectedMetrics,
      issues: detectedIssues,
    });
  }, [pageName, isMonitoring, thresholds, onOptimizationNeeded]);

  /**
   * Analyze performance metrics for issues
   */
  const analyzePerformanceIssues = (
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): string[] => {
    const issues: string[] = [];

    if (metrics.loadTime > thresholds.loadTime) {
      issues.push(`Load time (${metrics.loadTime}ms) exceeds threshold (${thresholds.loadTime}ms)`);
    }

    if (metrics.coreWebVitals.lcp > thresholds.lcp) {
      issues.push(`LCP (${metrics.coreWebVitals.lcp}ms) exceeds threshold (${thresholds.lcp}ms)`);
    }

    if (metrics.coreWebVitals.fid > thresholds.fid) {
      issues.push(`FID (${metrics.coreWebVitals.fid}ms) exceeds threshold (${thresholds.fid}ms)`);
    }

    if (metrics.coreWebVitals.cls > thresholds.cls) {
      issues.push(`CLS (${metrics.coreWebVitals.cls}) exceeds threshold (${thresholds.cls})`);
    }

    if (metrics.memoryUsage > 100) {
      // 100MB threshold
      issues.push(`Memory usage (${metrics.memoryUsage}MB) is high`);
    }

    return issues;
  };

  /**
   * Get performance score (0-100)
   */
  const getPerformanceScore = (metrics: PerformanceMetrics): number => {
    let score = 100;

    // Deduct points for each threshold violation
    if (metrics.loadTime > thresholds.loadTime) {
      const excess = (metrics.loadTime - thresholds.loadTime) / thresholds.loadTime;
      score -= Math.min(30, excess * 30);
    }

    if (metrics.coreWebVitals.lcp > thresholds.lcp) {
      const excess = (metrics.coreWebVitals.lcp - thresholds.lcp) / thresholds.lcp;
      score -= Math.min(25, excess * 25);
    }

    if (metrics.coreWebVitals.fid > thresholds.fid) {
      const excess = (metrics.coreWebVitals.fid - thresholds.fid) / thresholds.fid;
      score -= Math.min(25, excess * 25);
    }

    if (metrics.coreWebVitals.cls > thresholds.cls) {
      const excess = (metrics.coreWebVitals.cls - thresholds.cls) / thresholds.cls;
      score -= Math.min(20, excess * 20);
    }

    return Math.max(0, Math.round(score));
  };

  /**
   * Get status color based on performance
   */
  const getStatusColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get status icon based on performance
   */
  const getStatusIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return Clock;
    return AlertTriangle;
  };

  // Start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [startMonitoring, stopMonitoring, isMonitoring]);

  // Stop monitoring when page is fully loaded
  useEffect(() => {
    const handleLoad = () => {
      setTimeout(stopMonitoring, 1000); // Wait 1 second after load
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [stopMonitoring]);

  if (!showRealTime && !metrics) {
    return null;
  }

  const performanceScore = metrics ? getPerformanceScore(metrics) : 0;
  const StatusIcon = getStatusIcon(performanceScore);
  const statusColor = getStatusColor(performanceScore);

  return (
    <div className="space-y-4">
      {/* Performance Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                Performance Monitor
              </CardTitle>
              <CardDescription>Real-time performance metrics for {pageName} page</CardDescription>
            </div>
            {metrics && (
              <div className="text-right">
                <div className={`text-2xl font-bold ${statusColor}`}>{performanceScore}</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isMonitoring && !metrics && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Monitoring performance...</span>
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Load Time */}
              <div className="text-center">
                <div
                  className={`text-xl font-semibold ${
                    metrics.loadTime <= thresholds.loadTime ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {metrics.loadTime}ms
                </div>
                <div className="text-sm text-muted-foreground">Load Time</div>
                <div className="text-xs text-muted-foreground">Target: {thresholds.loadTime}ms</div>
              </div>

              {/* LCP */}
              <div className="text-center">
                <div
                  className={`text-xl font-semibold ${
                    metrics.coreWebVitals.lcp <= thresholds.lcp ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.round(metrics.coreWebVitals.lcp)}ms
                </div>
                <div className="text-sm text-muted-foreground">LCP</div>
                <div className="text-xs text-muted-foreground">Target: {thresholds.lcp}ms</div>
              </div>

              {/* FID */}
              <div className="text-center">
                <div
                  className={`text-xl font-semibold ${
                    metrics.coreWebVitals.fid <= thresholds.fid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.round(metrics.coreWebVitals.fid)}ms
                </div>
                <div className="text-sm text-muted-foreground">FID</div>
                <div className="text-xs text-muted-foreground">Target: {thresholds.fid}ms</div>
              </div>

              {/* Memory */}
              <div className="text-center">
                <div
                  className={`text-xl font-semibold ${
                    metrics.memoryUsage <= 100 ? 'text-green-600' : 'text-yellow-600'
                  }`}
                >
                  {metrics.memoryUsage}MB
                </div>
                <div className="text-sm text-muted-foreground">Memory</div>
                <div className="text-xs text-muted-foreground">Target: &lt;100MB</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues and Optimizations */}
      {issues.length > 0 && showOptimizations && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Performance Issues
            </CardTitle>
            <CardDescription>Detected performance issues that need attention</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{issue}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => runBenchmark()}
                disabled={isRunning}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunning ? 'Running...' : 'Run Benchmark'}
              </button>

              <button
                onClick={() => optimize()}
                disabled={isRunning}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <Zap className="h-3 w-3 mr-1 inline" />
                Auto-Optimize
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benchmark Results */}
      {benchmark && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Latest Benchmark
            </CardTitle>
            <CardDescription>Comprehensive performance benchmark results</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant={benchmark.passed ? 'default' : 'destructive'}>
                  {benchmark.passed ? 'PASSED' : 'FAILED'}
                </Badge>
                <span className="ml-2 text-sm text-muted-foreground">{benchmark.timestamp}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{benchmark.loadTime}ms</div>
                <div className="text-sm text-muted-foreground">
                  Load Time: {benchmark.loadTime}ms
                </div>
              </div>
            </div>

            {benchmark.issues.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Issues:</div>
                {benchmark.issues.map((issue: string, index: number) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {issue}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitor;
