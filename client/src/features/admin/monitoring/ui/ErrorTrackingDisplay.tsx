/**
 * Error Tracking Display Component
 * 
 * Displays error tracking information for a feature
 */

import { useState } from 'react';
import { useFeatureMetrics, useFeatureLogs } from '../hooks/use-monitoring';

interface ErrorTrackingDisplayProps {
  featureId: string;
}

export function ErrorTrackingDisplay({ featureId }: ErrorTrackingDisplayProps) {
  const [logLevel, setLogLevel] = useState<string>('error');
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
  const endTime = new Date();
  
  const { data: metrics, isLoading: metricsLoading } = useFeatureMetrics(featureId, startTime, endTime);
  const { data: logs, isLoading: logsLoading } = useFeatureLogs(featureId, logLevel, 50);

  if (metricsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate error statistics
  const totalErrors = metrics?.reduce((sum, m) => sum + m.failedRequests, 0) || 0;
  const totalRequests = metrics?.reduce((sum, m) => sum + m.totalRequests, 0) || 0;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Find max errors for chart scaling
  const maxErrors = metrics ? Math.max(...metrics.map(m => m.failedRequests)) : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Tracking (Last 24h)</h3>
      
      {/* Error Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-700 mb-1">Total Errors</div>
          <div className="text-2xl font-bold text-red-900">
            {totalErrors.toLocaleString()}
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-700 mb-1">Error Rate</div>
          <div className="text-2xl font-bold text-orange-900">
            {errorRate.toFixed(2)}%
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-700 mb-1">Peak Errors</div>
          <div className="text-2xl font-bold text-yellow-900">
            {maxErrors.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Error Chart */}
      {metrics && metrics.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Error Trend</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-end gap-1 h-32">
              {metrics.map((metric, index) => {
                const height = maxErrors > 0 ? (metric.failedRequests / maxErrors) * 100 : 0;
                const errorRateForMetric = metric.totalRequests > 0 
                  ? (metric.failedRequests / metric.totalRequests) * 100 
                  : 0;
                const color = errorRateForMetric > 5 ? 'bg-red-500 hover:bg-red-600' : 
                             errorRateForMetric > 1 ? 'bg-orange-500 hover:bg-orange-600' : 
                             'bg-yellow-500 hover:bg-yellow-600';
                return (
                  <div
                    key={index}
                    className={`flex-1 ${color} rounded-t transition-colors relative group`}
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {metric.failedRequests} errors
                      <br />
                      {errorRateForMetric.toFixed(2)}% rate
                      <br />
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{new Date(startTime).toLocaleTimeString()}</span>
              <span>{new Date(endTime).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Recent Error Logs</h4>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase ${
                          log.level === 'error' ? 'text-red-600' :
                          log.level === 'warn' ? 'text-yellow-600' :
                          log.level === 'info' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-xs text-gray-500">{log.category}</span>
                      </div>
                      <p className="text-sm text-gray-900 break-words">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
