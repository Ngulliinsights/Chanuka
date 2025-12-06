/**
 * Performance Metrics Collector Component
 * Provides real-time performance monitoring and metrics visualization
 * Optimized version with improved error handling, race condition prevention, and UI fixes
 */

import { useState, useEffect, useCallback, useRef } from "react";

import {
  performanceOptimizer,
  usePerformanceOptimization,
  BundleMetrics,
  CacheMetrics,
  OptimizationRecommendations,
} from '@client/utils/performance';

interface PerformanceMetricsProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onMetricsUpdate?: (metrics: MetricsState) => void;
}

interface MetricsState {
  coreWebVitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
  bundleMetrics: BundleMetrics | null;
  cacheMetrics: CacheMetrics | Record<string, never> | null;
  performanceScore: number;
  recommendations: OptimizationRecommendations[] | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const PerformanceMetricsCollector: React.FC<PerformanceMetricsProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000,
  onMetricsUpdate,
}) => {
  // Initialize all hooks unconditionally at the top level
  const [metrics, setMetrics] = useState<MetricsState>({
    coreWebVitals: {},
    bundleMetrics: null,
    cacheMetrics: {},
    performanceScore: 0,
    recommendations: null,
    isLoading: true,
    lastUpdated: null,
  });

  const [isVisible, setIsVisible] = useState(false);
  const performanceOptimization = usePerformanceOptimization('PerformanceMetricsCollector');
  
  // Stable refs for async operations and callback access
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const metricsCallbackRef = useRef(onMetricsUpdate);

  // Update callback ref when prop changes to avoid stale closures
  useEffect(() => {
    metricsCallbackRef.current = onMetricsUpdate;
  }, [onMetricsUpdate]);

  // Core metrics collection function with comprehensive error handling
  const collectMetrics = useCallback(async () => {
    // Cancel any in-flight requests to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setMetrics((prev) => ({ ...prev, isLoading: true }));

      // Early exit if component unmounted or signal aborted
      if (!mountedRef.current || signal.aborted) return;

      // Safely collect bundle metrics with isolated error handling
      let bundleMetrics: BundleMetrics | null = null;
      if (performanceOptimization?.getBundleMetrics) {
        try {
          bundleMetrics = await performanceOptimization.getBundleMetrics();
        } catch (error) {
          console.warn("Bundle metrics collection failed:", error);
        }
      }

      // Safely collect cache metrics with isolated error handling
      let cacheMetrics: CacheMetrics | Record<string, never> = {};
      if (performanceOptimization?.getCacheMetrics) {
        try {
          cacheMetrics = await performanceOptimization.getCacheMetrics();
        } catch (error) {
          console.warn("Cache metrics collection failed:", error);
        }
      }

      // Calculate performance score based on available metrics
      const performanceScore = calculatePerformanceScore(bundleMetrics, cacheMetrics);

      // Safely collect recommendations with normalization
      let recommendations: OptimizationRecommendations[] | null = null;
      if (performanceOptimization?.getLatestRecommendations) {
        try {
          const raw = await performanceOptimization.getLatestRecommendations();
          recommendations = normalizeRecommendations(raw);
        } catch (error) {
          console.warn("Recommendations collection failed:", error);
        }
      }

      // Collect Core Web Vitals from Performance API if available
      const coreWebVitals = collectCoreWebVitals();

      // Final mount check before state update
      if (!mountedRef.current || signal.aborted) return;

      const newMetrics: MetricsState = {
        coreWebVitals,
        bundleMetrics,
        cacheMetrics,
        performanceScore,
        recommendations,
        isLoading: false,
        lastUpdated: new Date(),
      };

      setMetrics(newMetrics);

      // Invoke callback if provided, with error boundary
      if (metricsCallbackRef.current) {
        try {
          metricsCallbackRef.current(newMetrics);
        } catch (error) {
          console.warn("Metrics update callback failed:", error);
        }
      }
    } catch (error) {
      // Ignore AbortError as it's expected during cleanup
      if (error instanceof Error && error.name === "AbortError") return;

      console.error("Failed to collect performance metrics:", error);

      if (mountedRef.current && !signal.aborted) {
        setMetrics((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [performanceOptimization]);

  // Helper function to collect Core Web Vitals from Performance API
  const collectCoreWebVitals = (): MetricsState['coreWebVitals'] => {
    if (typeof window === 'undefined' || !window.performance) {
      return {};
    }

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
        ttfb: navigation?.responseStart - navigation?.requestStart,
      };
    } catch (error) {
      console.warn("Failed to collect Core Web Vitals:", error);
      return {};
    }
  };

  // Normalize recommendations to always be an array
  const normalizeRecommendations = (
    raw: OptimizationRecommendations | OptimizationRecommendations[] | null
  ): OptimizationRecommendations[] | null => {
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  };

  // Calculate a composite performance score from available metrics
  const calculatePerformanceScore = (
    bundle: BundleMetrics | null,
    cache: CacheMetrics | Record<string, never>
  ): number => {
    let score = 100;

    // Deduct points for large bundle sizes
    if (bundle?.totalSize) {
      if (bundle.totalSize > 1000000) score -= 20; // > 1MB
      else if (bundle.totalSize > 500000) score -= 10; // > 500KB
    }

    // Add points for good cache hit rates
    if (cache && typeof cache === 'object') {
      const cacheStats = Object.values(cache);
      if (cacheStats.length > 0) {
        const avgHitRate = cacheStats.reduce((sum: number, stat: any) => 
          sum + (stat.hitRate || 0), 0) / cacheStats.length;
        if (avgHitRate < 50) score -= 15;
        else if (avgHitRate > 80) score += 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  // Set up metrics collection and auto-refresh
  useEffect(() => {
    if (!performanceOptimization) return;

    collectMetrics();

    let intervalId: number | undefined;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = window.setInterval(collectMetrics, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, collectMetrics, performanceOptimization]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Utility functions for formatting
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackgroundColor = (score: number): string => {
    if (score >= 90) return "bg-green-600";
    if (score >= 70) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getCoreWebVitalStatus = (metric: string, value?: number): string => {
    if (value == null) return "text-gray-400";

    const thresholds: Record<string, [number, number]> = {
      lcp: [2500, 4000],
      fid: [100, 300],
      cls: [0.1, 0.25],
      fcp: [1800, 3000],
      ttfb: [800, 1800],
    };

    const [good, needsImprovement] = thresholds[metric] || [0, 0];
    
    if (value <= good) return "text-green-600";
    if (value <= needsImprovement) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return "text-red-600";
      case 'medium': return "text-yellow-600";
      default: return "text-blue-600";
    }
  };

  // Export performance report as downloadable JSON
  const handleExportReport = () => {
    try {
      const report = performanceOptimizer.exportPerformanceReport();
      const reportString = typeof report === "string" 
        ? report 
        : JSON.stringify(report, null, 2);
      
      const blob = new Blob([reportString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export performance report:", error);
    }
  };

  // Conditional rendering after all hooks
  const shouldRender = (process.env.NODE_ENV !== "production" || showDetails) && !!performanceOptimization;

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="Performance Metrics"
        aria-label="Toggle performance metrics panel"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>

      {/* Metrics Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Performance Metrics
              </h3>
              <div className="flex items-center space-x-2">
                {metrics.isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" aria-label="Loading"></div>
                )}
                <button
                  type="button"
                  onClick={collectMetrics}
                  disabled={metrics.isLoading}
                  className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh metrics"
                  aria-label="Refresh metrics"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close panel"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {metrics.lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {metrics.lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Performance Score */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Performance Score
                </span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.performanceScore)}`}>
                  {metrics.performanceScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getScoreBackgroundColor(metrics.performanceScore)}`}
                  style={{ width: `${metrics.performanceScore}%` }}
                ></div>
              </div>
            </div>

            {/* Core Web Vitals */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Core Web Vitals
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'lcp', label: 'LCP', format: formatTime },
                  { key: 'fid', label: 'FID', format: formatTime },
                  { key: 'cls', label: 'CLS', format: (v: number) => v.toFixed(3) },
                  { key: 'fcp', label: 'FCP', format: formatTime },
                ].map(({ key, label, format }) => (
                  <div key={key} className="bg-gray-50 rounded p-2">
                    <div className="flex justify-between">
                      <span>{label}</span>
                      <span className={getCoreWebVitalStatus(key, metrics.coreWebVitals[key as keyof typeof metrics.coreWebVitals])}>
                        {typeof metrics.coreWebVitals[key as keyof typeof metrics.coreWebVitals] === "number"
                          ? format(metrics.coreWebVitals[key as keyof typeof metrics.coreWebVitals]!)
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bundle Metrics */}
            {metrics.bundleMetrics && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Bundle Analysis
                </h4>
                <div className="space-y-1 text-xs">
                  {[
                    { label: 'Total Size', value: metrics.bundleMetrics.totalSize },
                    { label: 'JavaScript', value: metrics.bundleMetrics.jsSize || 0 },
                    { label: 'CSS', value: metrics.bundleMetrics.cssSize || 0 },
                    { label: 'Images', value: metrics.bundleMetrics.imageSize || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span>{label}:</span>
                      <span className="font-mono">{formatBytes(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>Chunks:</span>
                    <span className="font-mono">{metrics.bundleMetrics.chunkCount || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Metrics */}
            {metrics.cacheMetrics && Object.keys(metrics.cacheMetrics).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Cache Performance
                </h4>
                <div className="space-y-2">
                  {Object.entries(metrics.cacheMetrics).map(([cacheName, stats]: [string, any]) => (
                    <div key={cacheName} className="bg-gray-50 rounded p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium capitalize">{cacheName}</span>
                        <span className="text-xs text-green-600">
                          {stats.hitRate != null ? `${Number(stats.hitRate).toFixed(1)}% hit rate` : "N/A"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {stats.entryCount ?? 0} entries, {formatBytes(stats.totalSize ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {metrics.recommendations && metrics.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {metrics.recommendations.map((rec, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className={`text-xs font-medium mb-1 ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </div>
                      <div className="text-xs space-y-1">
                        {rec.bundleOptimizations?.map((opt: string, i: number) => (
                          <div key={`bundle-${i}`}>• {opt}</div>
                        ))}
                        {rec.cacheOptimizations?.map((opt: string, i: number) => (
                          <div key={`cache-${i}`}>• {opt}</div>
                        ))}
                        {rec.performanceOptimizations?.map((opt: string, i: number) => (
                          <div key={`perf-${i}`}>• {opt}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleExportReport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                Export Performance Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetricsCollector;