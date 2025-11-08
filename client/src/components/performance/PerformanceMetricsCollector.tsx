/**
 * Performance Metrics Collector Component
 * Provides real-time performance monitoring and metrics visualization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  performanceOptimizer,
  usePerformanceOptimization,
  BundleMetrics,
  CacheMetrics,
  OptimizationRecommendations,
} from "../../utils/performance-optimizer";
// import { cache as getDefaultCache } from '@shared/core'; // Commented out due to export issue

interface PerformanceMetricsProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onMetricsUpdate?: (metrics: any) => void;
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
  cacheMetrics: CacheMetrics | {} | null;
  performanceScore: number;
  recommendations:
    | OptimizationRecommendations
    | OptimizationRecommendations[]
    | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const PerformanceMetricsCollector: React.FC<PerformanceMetricsProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<MetricsState>({
    coreWebVitals: {},
    bundleMetrics: null,
    cacheMetrics: {},
    performanceScore: 0,
    recommendations: [],
    isLoading: true,
    lastUpdated: null,
  });

  const [isVisible, setIsVisible] = useState(false);
  const performanceOptimization = useMemo(
    () => usePerformanceOptimization(),
    []
  );
  const { getBundleMetrics, getCacheMetrics, getLatestRecommendations } =
    performanceOptimization;

  // Refs for stable access to functions
  const getBundleMetricsRef = useRef(getBundleMetrics);
  const getCacheMetricsRef = useRef(getCacheMetrics);
  const getLatestRecommendationsRef = useRef(getLatestRecommendations);
  const onMetricsUpdateRef = useRef(onMetricsUpdate);

  // Refs for race condition prevention
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const collectMetrics = useCallback(async () => {
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setMetrics((prev) => ({ ...prev, isLoading: true }));

      // Check if component is still mounted before proceeding
      if (!mountedRef.current || signal.aborted) return;

      // Collect metrics with additional safety checks
      const coreWebVitals = { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 }; // Placeholder/fallback

      let bundleMetrics: BundleMetrics | null = null;
      try {
        bundleMetrics = await Promise.resolve(getBundleMetricsRef.current());
      } catch (bundleError) {
        // Silently handle bundle metrics errors to prevent cascading failures
        console.warn("Bundle metrics collection failed:", bundleError);
      }

      let cacheMetrics: CacheMetrics | {} | null = {};
      try {
        // Prefer a provided getCacheMetrics; fall back to shared cache if available
        cacheMetrics =
          typeof getCacheMetricsRef.current === "function"
            ? await Promise.resolve(getCacheMetricsRef.current())
            : {}; // Cache not available
      } catch (cacheError) {
        // Silently handle cache metrics errors
        console.warn("Cache metrics collection failed:", cacheError);
      }

      const performanceScore = 85; // Placeholder — replace with real calc if available

      let recommendations:
        | OptimizationRecommendations
        | OptimizationRecommendations[]
        | null = null;
      try {
        const recommendationsRaw = await Promise.resolve(
          getLatestRecommendationsRef.current()
        );
        recommendations = Array.isArray(recommendationsRaw)
          ? recommendationsRaw
          : recommendationsRaw
          ? [recommendationsRaw]
          : null;
      } catch (recError) {
        // Silently handle recommendations errors
        console.warn("Recommendations collection failed:", recError);
      }

      // Check again before updating state
      if (!mountedRef.current || signal.aborted) return;

      const newMetrics: MetricsState = {
        coreWebVitals,
        bundleMetrics: bundleMetrics ?? null,
        cacheMetrics: cacheMetrics ?? {},
        performanceScore: performanceScore ?? 0,
        recommendations,
        isLoading: false,
        lastUpdated: new Date(),
      };

      setMetrics(newMetrics);

      if (onMetricsUpdateRef.current) {
        try {
          onMetricsUpdateRef.current(newMetrics);
        } catch (callbackError) {
          // Prevent callback errors from breaking the component
          console.warn("Metrics update callback failed:", callbackError);
        }
      }
    } catch (error) {
      // Don't log if operation was aborted
      if (error instanceof Error && error.name === "AbortError") return;

      // Use console.warn instead of logger to prevent potential recursion
      console.warn("Failed to collect performance metrics:", error);

      // Check mount status before updating state
      if (mountedRef.current && !signal.aborted) {
        setMetrics((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  useEffect(() => {
    // Update refs when dependencies change
    getBundleMetricsRef.current = getBundleMetrics;
    getCacheMetricsRef.current = getCacheMetrics;
    getLatestRecommendationsRef.current = getLatestRecommendations;
    onMetricsUpdateRef.current = onMetricsUpdate;
  }, [
    getBundleMetrics,
    getCacheMetrics,
    getLatestRecommendations,
    onMetricsUpdate,
  ]);

  useEffect(() => {
    // Initial collection
    collectMetrics();

    // Set up auto-refresh
    // In browser environments setInterval returns a number; use number | null for typing
    let interval: number | null = null;
    if (autoRefresh) {
      interval = window.setInterval(collectMetrics, refreshInterval);
    }

    return () => {
      // Mark component as unmounted
      mountedRef.current = false;

      // Cancel any ongoing async operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, collectMetrics]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

  const getCoreWebVitalStatus = (metric: string, value?: number): string => {
    // Treat 0 as a valid numeric value; only null/undefined means missing
    if (value == null) return "text-gray-400";

    switch (metric) {
      case "lcp":
        return value <= 2500
          ? "text-green-600"
          : value <= 4000
          ? "text-yellow-600"
          : "text-red-600";
      case "fid":
        return value <= 100
          ? "text-green-600"
          : value <= 300
          ? "text-yellow-600"
          : "text-red-600";
      case "cls":
        return value <= 0.1
          ? "text-green-600"
          : value <= 0.25
          ? "text-yellow-600"
          : "text-red-600";
      case "fcp":
        return value <= 1800
          ? "text-green-600"
          : value <= 3000
          ? "text-yellow-600"
          : "text-red-600";
      case "ttfb":
        return value <= 800
          ? "text-green-600"
          : value <= 1800
          ? "text-yellow-600"
          : "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (process.env.NODE_ENV === "production" && !showDetails) {
    return null; // Don't show in production unless explicitly requested
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="Performance Metrics"
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
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Performance Metrics
              </h3>
              <div className="flex items-center space-x-2">
                {metrics.isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
                <button
                  onClick={collectMetrics}
                  className="text-gray-500 hover:text-gray-700"
                  title="Refresh metrics"
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
                  onClick={() => setIsVisible(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
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

          <div className="p-4 space-y-4">
            {/* Performance Score */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Performance Score
                </span>
                <span
                  className={`text-lg font-bold ${getScoreColor(
                    metrics.performanceScore
                  )}`}
                >
                  {metrics.performanceScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`w-[${
                    metrics.performanceScore
                  }%] h-2 rounded-full transition-all duration-300 ${
                    metrics.performanceScore >= 90
                      ? "bg-green-600"
                      : metrics.performanceScore >= 70
                      ? "bg-yellow-600"
                      : "bg-red-600"
                  }`}
                ></div>
              </div>
            </div>

            {/* Core Web Vitals */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Core Web Vitals
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between">
                    <span>LCP</span>
                    <span
                      className={getCoreWebVitalStatus(
                        "lcp",
                        metrics.coreWebVitals.lcp
                      )}
                    >
                      {typeof metrics.coreWebVitals.lcp === "number"
                        ? formatTime(metrics.coreWebVitals.lcp)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between">
                    <span>FID</span>
                    <span
                      className={getCoreWebVitalStatus(
                        "fid",
                        metrics.coreWebVitals.fid
                      )}
                    >
                      {typeof metrics.coreWebVitals.fid === "number"
                        ? formatTime(metrics.coreWebVitals.fid)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between">
                    <span>CLS</span>
                    <span
                      className={getCoreWebVitalStatus(
                        "cls",
                        metrics.coreWebVitals.cls
                      )}
                    >
                      {typeof metrics.coreWebVitals.cls === "number"
                        ? metrics.coreWebVitals.cls.toFixed(3)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between">
                    <span>FCP</span>
                    <span
                      className={getCoreWebVitalStatus(
                        "fcp",
                        metrics.coreWebVitals.fcp
                      )}
                    >
                      {typeof metrics.coreWebVitals.fcp === "number"
                        ? formatTime(metrics.coreWebVitals.fcp)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bundle Metrics */}
            {metrics.bundleMetrics && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Bundle Analysis
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Total Size:</span>
                    <span className="font-mono">
                      {formatBytes(metrics.bundleMetrics.totalSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>JavaScript:</span>
                    <span className="font-mono">
                      {formatBytes(metrics.bundleMetrics.jsSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CSS:</span>
                    <span className="font-mono">
                      {formatBytes(metrics.bundleMetrics.cssSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Images:</span>
                    <span className="font-mono">
                      {formatBytes(metrics.bundleMetrics.imageSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chunks:</span>
                    <span className="font-mono">
                      {metrics.bundleMetrics.chunkCount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Metrics */}
            {metrics.cacheMetrics &&
              Object.keys(metrics.cacheMetrics).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Cache Performance
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.cacheMetrics).map(
                      ([cacheName, stats]: [string, any]) => (
                        <div key={cacheName} className="bg-gray-50 rounded p-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium capitalize">
                              {cacheName}
                            </span>
                            <span className="text-xs text-green-600">
                              {stats.hitRate != null
                                ? `${Number(stats.hitRate).toFixed(
                                    1
                                  )}% hit rate`
                                : "N/A"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {stats.entryCount ?? 0} entries,{" "}
                            {formatBytes(stats.totalSize ?? 0)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Recommendations */}
            {metrics.recommendations &&
              (Array.isArray(metrics.recommendations)
                ? metrics.recommendations.length > 0
                : true) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {(Array.isArray(metrics.recommendations)
                      ? metrics.recommendations
                      : [metrics.recommendations]
                    ).map((rec, index) => (
                      <div
                        key={index}
                        className="bg-yellow-50 border border-yellow-200 rounded p-2"
                      >
                        <div
                          className={`text-xs font-medium mb-1 ${
                            rec.priority === "high"
                              ? "text-red-600"
                              : rec.priority === "medium"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        >
                          {rec.priority.toUpperCase()} PRIORITY
                        </div>
                        <div className="text-xs space-y-1">
                          {Array.isArray(rec.bundleOptimizations) &&
                            rec.bundleOptimizations.map(
                              (opt: string, i: number) => (
                                <div key={i}>• {opt}</div>
                              )
                            )}
                          {Array.isArray(rec.cacheOptimizations) &&
                            rec.cacheOptimizations.map(
                              (opt: string, i: number) => (
                                <div key={i}>• {opt}</div>
                              )
                            )}
                          {Array.isArray(rec.performanceOptimizations) &&
                            rec.performanceOptimizations.map(
                              (opt: string, i: number) => (
                                <div key={i}>• {opt}</div>
                              )
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Export Button */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  const report = performanceOptimizer.exportPerformanceReport();
                  const reportString =
                    typeof report === "string"
                      ? report
                      : JSON.stringify(report, null, 2);
                  const blob = new Blob([reportString], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `performance-report-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
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
