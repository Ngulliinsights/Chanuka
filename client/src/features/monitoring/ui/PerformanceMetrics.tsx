/**
 * Performance Metrics Component
 * 
 * Displays performance metrics for a feature
 */

import { useFeatureMetrics } from '../hooks/use-monitoring';

interface PerformanceMetricsProps {
  featureId: string;
}

export function PerformanceMetrics({ featureId }: PerformanceMetricsProps) {
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
  const endTime = new Date();
  
  const { data: metrics, isLoading, error } = useFeatureMetrics(featureId, startTime, endTime);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !metrics || metrics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No performance data available
      </div>
    );
  }

  // Calculate max values for scaling
  const maxAvg = Math.max(...metrics.map(m => parseFloat(m.avgResponseTime)));
  const maxP95 = Math.max(...metrics.map(m => parseFloat(m.p95ResponseTime)));
  const maxP99 = Math.max(...metrics.map(m => parseFloat(m.p99ResponseTime)));
  const maxValue = Math.max(maxAvg, maxP95, maxP99);

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics (Last 24h)</h3>
      
      {/* Response Time Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Response Times</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-4">
            {/* Average Response Time */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Average</span>
                <span>{(metrics.reduce((sum, m) => sum + parseFloat(m.avgResponseTime), 0) / metrics.length).toFixed(0)}ms</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {metrics.map((metric, index) => {
                  const value = parseFloat(metric.avgResponseTime);
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-blue-400 rounded-t hover:bg-blue-500 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {value.toFixed(0)}ms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* P95 Response Time */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>P95</span>
                <span>{(metrics.reduce((sum, m) => sum + parseFloat(m.p95ResponseTime), 0) / metrics.length).toFixed(0)}ms</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {metrics.map((metric, index) => {
                  const value = parseFloat(metric.p95ResponseTime);
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-yellow-400 rounded-t hover:bg-yellow-500 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {value.toFixed(0)}ms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* P99 Response Time */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>P99</span>
                <span>{(metrics.reduce((sum, m) => sum + parseFloat(m.p99ResponseTime), 0) / metrics.length).toFixed(0)}ms</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {metrics.map((metric, index) => {
                  const value = parseFloat(metric.p99ResponseTime);
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-red-400 rounded-t hover:bg-red-500 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {value.toFixed(0)}ms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-4">
            <span>{new Date(startTime).toLocaleTimeString()}</span>
            <span>{new Date(endTime).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-xs font-medium text-blue-700 mb-1">Avg Response</div>
          <div className="text-xl font-bold text-blue-900">
            {(metrics.reduce((sum, m) => sum + parseFloat(m.avgResponseTime), 0) / metrics.length).toFixed(0)}ms
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-xs font-medium text-yellow-700 mb-1">P95 Response</div>
          <div className="text-xl font-bold text-yellow-900">
            {(metrics.reduce((sum, m) => sum + parseFloat(m.p95ResponseTime), 0) / metrics.length).toFixed(0)}ms
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-xs font-medium text-red-700 mb-1">P99 Response</div>
          <div className="text-xl font-bold text-red-900">
            {(metrics.reduce((sum, m) => sum + parseFloat(m.p99ResponseTime), 0) / metrics.length).toFixed(0)}ms
          </div>
        </div>
      </div>
    </div>
  );
}
