/**
 * Error Monitoring Dashboard
 * 
 * Provides real-time error monitoring, analytics, and system health insights
 * for development and production environments.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { errorHandler, ErrorDomain, ErrorSeverity } from '../../utils/unified-error-handler';
import { smartRecoveryEngine } from '../../utils/advanced-error-recovery';
import { errorRateLimiter } from '../../utils/error-rate-limiter';
import { errorAnalytics } from '../../utils/error-analytics';

interface ErrorMonitoringDashboardProps {
  refreshInterval?: number;
  maxDisplayErrors?: number;
  showAdvancedMetrics?: boolean;
  enableExport?: boolean;
}

export function ErrorMonitoringDashboard({
  refreshInterval = 5000,
  maxDisplayErrors = 50,
  showAdvancedMetrics = true,
  enableExport = true,
}: ErrorMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'recovery' | 'analytics'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Data states
  const [errorStats, setErrorStats] = useState(errorHandler.getErrorStats());
  const [recentErrors, setRecentErrors] = useState(errorHandler.getRecentErrors());
  const [recoveryStats, setRecoveryStats] = useState(smartRecoveryEngine.getRecoveryInsights());
  const [rateLimitStats, setRateLimitStats] = useState(errorRateLimiter.getGlobalStats());

  // Refresh data
  const refreshData = () => {
    setErrorStats(errorHandler.getErrorStats());
    setRecentErrors(errorHandler.getRecentErrors().slice(0, maxDisplayErrors));
    setRecoveryStats(smartRecoveryEngine.getRecoveryInsights());
    setRateLimitStats(errorRateLimiter.getGlobalStats());
    setLastRefresh(Date.now());
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  // Computed metrics
  const healthScore = useMemo(() => {
    const totalErrors = errorStats.total;
    const criticalErrors = errorStats.bySeverity[ErrorSeverity.CRITICAL] || 0;
    const recoveryRate = recoveryStats.successRate;
    
    if (totalErrors === 0) return 100;
    
    let score = 100;
    score -= Math.min(criticalErrors * 20, 60); // Critical errors heavily impact score
    score -= Math.min((totalErrors - criticalErrors) * 2, 30); // Other errors
    score += recoveryRate * 20; // Recovery success improves score
    
    return Math.max(0, Math.min(100, score));
  }, [errorStats, recoveryStats]);

  const errorTrend = useMemo(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentErrorsCount = recentErrors.filter(e => e.timestamp > oneHourAgo).length;
    const totalErrorsCount = recentErrors.length;
    
    if (totalErrorsCount === 0) return 'stable';
    
    const recentRate = recentErrorsCount / totalErrorsCount;
    if (recentRate > 0.7) return 'increasing';
    if (recentRate < 0.3) return 'decreasing';
    return 'stable';
  }, [recentErrors]);

  // Export functionality
  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      errorStats,
      recentErrors: recentErrors.slice(0, 20), // Limit for export size
      recoveryStats,
      rateLimitStats,
      healthScore,
      errorTrend,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearErrors = () => {
    errorHandler.clearErrors();
    smartRecoveryEngine.reset();
    errorRateLimiter.reset();
    refreshData();
  };

  return (
    <div className="error-monitoring-dashboard p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-gray-600">
            Last updated: {new Date(lastRefresh).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Resume'}
          </Button>
          <Button variant="outline" onClick={refreshData}>
            🔄 Refresh
          </Button>
          {enableExport && (
            <Button variant="outline" onClick={exportData}>
              📊 Export
            </Button>
          )}
          <Button variant="destructive" onClick={clearErrors}>
            🗑️ Clear
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              healthScore >= 80 ? 'text-green-600' :
              healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {healthScore.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">System Health</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{errorStats.total}</div>
            <div className="text-sm text-gray-600">Total Errors</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {(recoveryStats.successRate * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Recovery Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              errorTrend === 'decreasing' ? 'text-green-600' :
              errorTrend === 'increasing' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {errorTrend === 'increasing' ? '📈' : 
               errorTrend === 'decreasing' ? '📉' : '➡️'}
            </div>
            <div className="text-sm text-gray-600">Error Trend</div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(['overview', 'errors', 'recovery', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Error Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Error Distribution by Type</h3>
            <div className="space-y-3">
              {Object.entries(errorStats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize">{type.toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / errorStats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Severity Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Error Distribution by Severity</h3>
            <div className="space-y-3">
              {Object.entries(errorStats.bySeverity).map(([severity, count]) => {
                const color = severity === 'CRITICAL' ? 'red' :
                            severity === 'HIGH' ? 'orange' :
                            severity === 'MEDIUM' ? 'yellow' : 'blue';
                return (
                  <div key={severity} className="flex justify-between items-center">
                    <span className="capitalize">{severity.toLowerCase()}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`bg-${color}-600 h-2 rounded-full`}
                          style={{ width: `${(count / errorStats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Rate Limiting Status */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rate Limiting Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {rateLimitStats.activeLimiters}
                </div>
                <div className="text-sm text-gray-600">Active Limiters</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {rateLimitStats.totalLimitedKeys}
                </div>
                <div className="text-sm text-gray-600">Limited Sources</div>
              </div>
            </div>
          </Card>

          {/* Recovery Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recovery Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Recoveries</span>
                <span className="font-medium">{recoveryStats.totalRecoveries}</span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate</span>
                <span className="font-medium">
                  {(recoveryStats.successRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Best Strategy</span>
                <span className="font-medium">{recoveryStats.mostSuccessfulStrategy}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'errors' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentErrors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No errors recorded 🎉
              </div>
            ) : (
              recentErrors.map((error) => (
                <div
                  key={error.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        error.severity === ErrorSeverity.CRITICAL ? 'bg-red-100 text-red-800' :
                        error.severity === ErrorSeverity.HIGH ? 'bg-orange-100 text-orange-800' :
                        error.severity === ErrorSeverity.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {error.severity}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        {error.type}
                      </span>
                      {error.recovered && (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          RECOVERED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{error.message}</div>
                  {error.context?.component && (
                    <div className="text-xs text-gray-600">
                      Component: {error.context.component}
                      {error.context.action && ` → ${error.context.action}`}
                    </div>
                  )}
                  {error.retryCount > 0 && (
                    <div className="text-xs text-gray-600">
                      Retry attempts: {error.retryCount}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'recovery' && showAdvancedMetrics && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recovery Strategy Performance</h3>
            <div className="space-y-3">
              {smartRecoveryEngine.getStrategyPerformance().map((strategy) => (
                <div key={strategy.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{strategy.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      strategy.circuitBreakerState === 'CLOSED' ? 'bg-green-100 text-green-800' :
                      strategy.circuitBreakerState === 'HALF_OPEN' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {strategy.circuitBreakerState}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Success Rate</div>
                      <div className="font-medium">
                        {(strategy.successRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Attempts</div>
                      <div className="font-medium">{strategy.totalAttempts}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Response</div>
                      <div className="font-medium">{strategy.averageResponseTime}ms</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Common Failure Patterns</h3>
            <div className="space-y-2">
              {recoveryStats.commonFailurePatterns.map((pattern, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-sm">{pattern.pattern}</span>
                  <span className="text-sm font-medium">{pattern.count} occurrences</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && showAdvancedMetrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Analytics Integration</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Analytics Enabled</span>
              <span className={`px-2 py-1 rounded text-xs ${
                errorAnalytics.isEnabled() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {errorAnalytics.isEnabled() ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Providers</span>
              <span className="font-medium">
                {errorAnalytics.getProviders().join(', ') || 'None'}
              </span>
            </div>
            {errorAnalytics.getProviders().length > 0 && (
              <div className="text-sm text-gray-600">
                Error data is being sent to configured analytics providers for monitoring and alerting.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}