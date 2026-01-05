/**
 * Route Performance Profiler
 *
 * Provides detailed performance profiling for each route during development
 * Tracks render times, component mount/unmount cycles, and resource usage
 *
 * Requirements: 11.4, 11.5
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { logger } from '@client/utils/logger';

/**
 * Performance metrics for a route
 */
interface RoutePerformanceMetrics {
  routePath: string;
  loadStartTime: number;
  loadEndTime: number;
  totalLoadTime: number;
  renderStartTime: number;
  renderEndTime: number;
  totalRenderTime: number;
  componentMountTime: number;
  resourceCount: number;
  memoryUsage?: number;
  networkRequests: number;
  errorCount: number;
  timestamp: Date;
}

/**
 * Component performance metrics
 */
interface ComponentMetrics {
  name: string;
  mountTime: number;
  renderTime: number;
  updateCount: number;
  errorCount: number;
}

/**
 * Performance profiler state
 */
interface ProfilerState {
  isEnabled: boolean;
  currentRoute: string;
  routeMetrics: Map<string, RoutePerformanceMetrics[]>;
  componentMetrics: Map<string, ComponentMetrics>;
  networkRequests: PerformanceEntry[];
  resourceEntries: PerformanceEntry[];
}

/**
 * Route Performance Profiler Hook
 */
export function useRouteProfiler(enabled: boolean = process.env.NODE_ENV === 'development') {
  const location = useLocation();
  const [profilerState, setProfilerState] = useState<ProfilerState>({
    isEnabled: enabled,
    currentRoute: location.pathname,
    routeMetrics: new Map(),
    componentMetrics: new Map(),
    networkRequests: [],
    resourceEntries: []
  });

  const routeStartTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(Date.now());
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  /**
   * Start profiling a route
   */
  const startRouteProfiling = useCallback((routePath: string) => {
    if (!profilerState.isEnabled) return;

    routeStartTime.current = Date.now();
    renderStartTime.current = performance.now();

    logger.info('Route profiling started', { route: routePath });
  }, [profilerState.isEnabled]);

  /**
   * End profiling a route
   */
  const endRouteProfiling = useCallback((routePath: string) => {
    if (!profilerState.isEnabled) return;

    const loadEndTime = Date.now();
    const renderEndTime = performance.now();
    const totalLoadTime = loadEndTime - routeStartTime.current;
    const totalRenderTime = renderEndTime - renderStartTime.current;

    // Get performance entries
    const resourceEntries = performance.getEntriesByType('resource');
    const navigationEntries = performance.getEntriesByType('navigation');
    const networkRequests = performance.getEntriesByType('xmlhttprequest');

    // Get memory usage if available
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : undefined;

    const metrics: RoutePerformanceMetrics = {
      routePath,
      loadStartTime: routeStartTime.current,
      loadEndTime,
      totalLoadTime,
      renderStartTime: renderStartTime.current,
      renderEndTime,
      totalRenderTime,
      componentMountTime: 0, // Will be updated by component profiler
      resourceCount: resourceEntries.length,
      memoryUsage,
      networkRequests: networkRequests.length,
      errorCount: 0, // Will be updated by error tracking
      timestamp: new Date()
    };

    setProfilerState(prev => {
      const routeMetrics = new Map(prev.routeMetrics);
      const existingMetrics = routeMetrics.get(routePath) || [];
      existingMetrics.push(metrics);

      // Keep only last 10 metrics per route
      if (existingMetrics.length > 10) {
        existingMetrics.splice(0, existingMetrics.length - 10);
      }

      routeMetrics.set(routePath, existingMetrics);

      return {
        ...prev,
        routeMetrics,
        resourceEntries: [...resourceEntries],
        networkRequests: [...networkRequests]
      };
    });

    logger.info('Route profiling completed', {
      route: routePath,
      loadTime: totalLoadTime,
      renderTime: totalRenderTime,
      resourceCount: resourceEntries.length,
      memoryUsage
    });
  }, [profilerState.isEnabled]);

  /**
   * Profile component performance
   */
  const profileComponent = useCallback((componentName: string, phase: 'mount' | 'update', actualDuration: number) => {
    if (!profilerState.isEnabled) return;

    setProfilerState(prev => {
      const componentMetrics = new Map(prev.componentMetrics);
      const existing = componentMetrics.get(componentName) || {
        name: componentName,
        mountTime: 0,
        renderTime: 0,
        updateCount: 0,
        errorCount: 0
      };

      if (phase === 'mount') {
        existing.mountTime = actualDuration;
      } else {
        existing.renderTime += actualDuration;
        existing.updateCount++;
      }

      componentMetrics.set(componentName, existing);

      return {
        ...prev,
        componentMetrics
      };
    });
  }, [profilerState.isEnabled]);

  /**
   * Get performance metrics for a route
   */
  const getRouteMetrics = useCallback((routePath: string): RoutePerformanceMetrics[] => {
    return profilerState.routeMetrics.get(routePath) || [];
  }, [profilerState.routeMetrics]);

  /**
   * Get all performance metrics
   */
  const getAllMetrics = useCallback(() => {
    return {
      routeMetrics: Object.fromEntries(profilerState.routeMetrics),
      componentMetrics: Object.fromEntries(profilerState.componentMetrics),
      networkRequests: profilerState.networkRequests,
      resourceEntries: profilerState.resourceEntries
    };
  }, [profilerState]);

  /**
   * Clear all metrics
   */
  const clearMetrics = useCallback(() => {
    setProfilerState(prev => ({
      ...prev,
      routeMetrics: new Map(),
      componentMetrics: new Map(),
      networkRequests: [],
      resourceEntries: []
    }));
  }, []);

  /**
   * Export metrics as JSON
   */
  const exportMetrics = useCallback(() => {
    const data = getAllMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `route-performance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [getAllMetrics]);

  /**
   * Set up performance observer
   */
  useEffect(() => {
    if (!profilerState.isEnabled || typeof window === 'undefined') return;

    try {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        setProfilerState(prev => ({
          ...prev,
          networkRequests: [...prev.networkRequests, ...entries.filter(e => e.entryType === 'xmlhttprequest')],
          resourceEntries: [...prev.resourceEntries, ...entries.filter(e => e.entryType === 'resource')]
        }));
      });

      performanceObserver.current.observe({
        entryTypes: ['resource', 'navigation', 'measure', 'mark']
      });
    } catch (error) {
      logger.warn('Performance observer not supported', { error });
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, [profilerState.isEnabled]);

  /**
   * Track route changes
   */
  useEffect(() => {
    if (!profilerState.isEnabled) return;

    // End profiling for previous route
    if (profilerState.currentRoute !== location.pathname) {
      endRouteProfiling(profilerState.currentRoute);
    }

    // Start profiling for new route
    startRouteProfiling(location.pathname);

    setProfilerState(prev => ({
      ...prev,
      currentRoute: location.pathname
    }));
  }, [location.pathname, profilerState.isEnabled, startRouteProfiling, endRouteProfiling, profilerState.currentRoute]);

  return {
    isEnabled: profilerState.isEnabled,
    currentRoute: profilerState.currentRoute,
    startRouteProfiling,
    endRouteProfiling,
    profileComponent,
    getRouteMetrics,
    getAllMetrics,
    clearMetrics,
    exportMetrics,
    routeMetrics: profilerState.routeMetrics,
    componentMetrics: profilerState.componentMetrics
  };
}

/**
 * Route Performance Profiler Component
 */
export const RouteProfiler: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const profiler = useRouteProfiler();

  // Only render profiler UI in development
  if (process.env.NODE_ENV !== 'development' || !profiler.isEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <RouteProfilerUI profiler={profiler} />
    </>
  );
};

/**
 * Route Profiler UI Component (Development Only)
 */
interface RouteProfilerUIProps {
  profiler: ReturnType<typeof useRouteProfiler>;
}

const RouteProfilerUI: React.FC<RouteProfilerUIProps> = ({ profiler }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>('');

  const currentMetrics = selectedRoute ? profiler.getRouteMetrics(selectedRoute) : [];
  const latestMetrics = currentMetrics[currentMetrics.length - 1];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        title="Toggle Route Profiler"
      >
        📊 Profiler
      </button>

      {/* Profiler Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Route Performance</h3>
            <div className="flex space-x-2">
              <button
                onClick={profiler.exportMetrics}
                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                title="Export Metrics"
              >
                Export
              </button>
              <button
                onClick={profiler.clearMetrics}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                title="Clear Metrics"
              >
                Clear
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Current Route Info */}
          <div className="mb-3 p-2 bg-blue-50 rounded">
            <div className="text-sm font-medium text-blue-900">Current Route</div>
            <div className="text-xs text-blue-700">{profiler.currentRoute}</div>
          </div>

          {/* Route Selector */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Route
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Select a route...</option>
              {Array.from(profiler.routeMetrics.keys()).map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>

          {/* Metrics Display */}
          {latestMetrics && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700">Load Time</div>
                  <div className="text-gray-900">{latestMetrics.totalLoadTime}ms</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700">Render Time</div>
                  <div className="text-gray-900">{latestMetrics.totalRenderTime.toFixed(2)}ms</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700">Resources</div>
                  <div className="text-gray-900">{latestMetrics.resourceCount}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700">Network</div>
                  <div className="text-gray-900">{latestMetrics.networkRequests}</div>
                </div>
              </div>

              {latestMetrics.memoryUsage && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700 text-xs">Memory Usage</div>
                  <div className="text-gray-900 text-xs">
                    {(latestMetrics.memoryUsage / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}

              {/* Performance Warnings */}
              <div className="space-y-1">
                {latestMetrics.totalLoadTime > 3000 && (
                  <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    ⚠️ Slow load time ({latestMetrics.totalLoadTime}ms)
                  </div>
                )}
                {latestMetrics.totalRenderTime > 16 && (
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    ⚠️ Slow render time ({latestMetrics.totalRenderTime.toFixed(2)}ms)
                  </div>
                )}
                {latestMetrics.resourceCount > 50 && (
                  <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    ⚠️ Many resources ({latestMetrics.resourceCount})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Component Metrics */}
          {profiler.componentMetrics.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Component Performance</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(profiler.componentMetrics.entries()).map(([name, metrics]) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span className="text-gray-600 truncate">{name}</span>
                    <span className="text-gray-900">{metrics.renderTime.toFixed(2)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteProfiler;
