/**
 * Performance Dashboard Component
 * Comprehensive performance monitoring dashboard for administrators
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitoring';
import { usePerformanceOptimization } from '../../utils/performance-optimizer';
import { cacheManager } from '../../utils/cache-strategy';
import { logger } from '../utils/logger.js';

interface PerformanceDashboardProps {
  className?: string;
}

interface DashboardMetrics {
  coreWebVitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
  bundleMetrics: any;
  cacheMetrics: Record<string, any>;
  performanceScore: number;
  recommendations: any[];
  historicalData: any[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    coreWebVitals: {},
    bundleMetrics: null,
    cacheMetrics: {},
    performanceScore: 0,
    recommendations: [],
    historicalData: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    getBundleMetrics,
    getCacheMetrics,
    getOptimizationRecommendations,
    exportPerformanceReport
  } = usePerformanceOptimization();

  useEffect(() => {
    loadMetrics();
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);

      const coreWebVitals = performanceMonitor.getCoreWebVitals();
      const bundleMetrics = getBundleMetrics();
      const cacheMetrics = cacheManager.getAllStats();
      const performanceScore = performanceMonitor.getPerformanceScore();
      const recommendations = getOptimizationRecommendations();
      const historicalData = loadHistoricalData();

      setMetrics({
        coreWebVitals,
        bundleMetrics,
        cacheMetrics,
        performanceScore,
        recommendations,
        historicalData
      });
    } catch (error) {
      logger.error('Failed to load performance metrics:', { component: 'Chanuka' }, error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoricalData = () => {
    try {
      const stored = localStorage.getItem('performance-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        return data.slice(-50); // Last 50 entries
      }
    } catch (error) {
      console.warn('Failed to load historical data:', error);
    }
    return [];
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCoreWebVitalStatus = (metric: string, value?: number): { color: string; status: string } => {
    if (!value) return { color: 'text-gray-400', status: 'N/A' };
    
    switch (metric) {
      case 'lcp':
        return value <= 2500 
          ? { color: 'text-green-600', status: 'Good' }
          : value <= 4000 
          ? { color: 'text-yellow-600', status: 'Needs Improvement' }
          : { color: 'text-red-600', status: 'Poor' };
      case 'fid':
        return value <= 100 
          ? { color: 'text-green-600', status: 'Good' }
          : value <= 300 
          ? { color: 'text-yellow-600', status: 'Needs Improvement' }
          : { color: 'text-red-600', status: 'Poor' };
      case 'cls':
        return value <= 0.1 
          ? { color: 'text-green-600', status: 'Good' }
          : value <= 0.25 
          ? { color: 'text-yellow-600', status: 'Needs Improvement' }
          : { color: 'text-red-600', status: 'Poor' };
      default:
        return { color: 'text-gray-600', status: 'Unknown' };
    }
  };

  const handleExportReport = () => {
    const report = exportPerformanceReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCaches = () => {
    cacheManager.clearAll();
    alert('All caches cleared successfully');
    loadMetrics();
  };

  if (isLoading && !metrics.performanceScore) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            <p className="text-gray-600 mt-1">Monitor and optimize application performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={loadMetrics}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={handleExportReport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Performance Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance Score</h3>
        <div className="flex items-center justify-center">
          <div className={`text-6xl font-bold rounded-full w-32 h-32 flex items-center justify-center ${getScoreColor(metrics.performanceScore)}`}>
            {metrics.performanceScore}
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                metrics.performanceScore >= 90 ? 'bg-green-600' :
                metrics.performanceScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${metrics.performanceScore}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {metrics.performanceScore >= 90 ? 'Excellent' :
             metrics.performanceScore >= 70 ? 'Good' : 'Needs Improvement'}
          </p>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'lcp', name: 'Largest Contentful Paint', unit: 'ms', target: '< 2.5s' },
            { key: 'fid', name: 'First Input Delay', unit: 'ms', target: '< 100ms' },
            { key: 'cls', name: 'Cumulative Layout Shift', unit: '', target: '< 0.1' }
          ].map(({ key, name, unit, target }) => {
            const value = metrics.coreWebVitals[key as keyof typeof metrics.coreWebVitals];
            const status = getCoreWebVitalStatus(key, value);
            
            return (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${status.color} bg-opacity-20`}>
                    {status.status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {value ? (key === 'cls' ? value.toFixed(3) : formatTime(value)) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 mt-1">Target: {target}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bundle Analysis */}
      {metrics.bundleMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bundle Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.bundleMetrics.totalSize)}
              </div>
              <div className="text-sm text-gray-500">Total Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.bundleMetrics.jsSize)}
              </div>
              <div className="text-sm text-gray-500">JavaScript</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.bundleMetrics.cssSize)}
              </div>
              <div className="text-sm text-gray-500">CSS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.bundleMetrics.chunkCount}
              </div>
              <div className="text-sm text-gray-500">Chunks</div>
            </div>
          </div>
          
          {metrics.bundleMetrics.duplicateModules?.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Duplicate Modules Detected</h4>
              <div className="text-sm text-yellow-700">
                {metrics.bundleMetrics.duplicateModules.slice(0, 3).map((module: string, index: number) => (
                  <div key={index}>• {module}</div>
                ))}
                {metrics.bundleMetrics.duplicateModules.length > 3 && (
                  <div>... and {metrics.bundleMetrics.duplicateModules.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cache Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Performance</h3>
          <button
            onClick={clearCaches}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Clear All Caches
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(metrics.cacheMetrics).map(([cacheName, stats]: [string, any]) => (
            <div key={cacheName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 capitalize mb-2">{cacheName} Cache</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hit Rate:</span>
                  <span className="font-medium text-green-600">
                    {stats.hitRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Entries:</span>
                  <span className="font-medium">{stats.entryCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Size:</span>
                  <span className="font-medium">{formatBytes(stats.totalSize || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Evictions:</span>
                  <span className="font-medium">{stats.evictions || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Recommendations</h3>
          <div className="space-y-4">
            {metrics.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                  </div>
                </div>
                <div className="space-y-2">
                  {rec.bundleOptimizations?.map((opt: string, i: number) => (
                    <div key={i} className="text-sm text-gray-700">• {opt}</div>
                  ))}
                  {rec.cacheOptimizations?.map((opt: string, i: number) => (
                    <div key={i} className="text-sm text-gray-700">• {opt}</div>
                  ))}
                  {rec.performanceOptimizations?.map((opt: string, i: number) => (
                    <div key={i} className="text-sm text-gray-700">• {opt}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trends */}
      {metrics.historicalData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="text-sm text-gray-600">
            <p>Historical data shows {metrics.historicalData.length} data points.</p>
            <p className="mt-2">
              Average LCP: {
                metrics.historicalData
                  .filter(d => d.lcp)
                  .reduce((sum, d, _, arr) => sum + d.lcp / arr.length, 0)
                  .toFixed(0)
              }ms
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;