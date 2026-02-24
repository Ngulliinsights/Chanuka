/**
 * Metrics Visualization Component
 * 
 * Displays key metrics for a feature
 */

import { useFeatureMetrics } from '../hooks/useMonitoring';

interface MetricsVisualizationProps {
  featureId: string;
}

export function MetricsVisualization({ featureId }: MetricsVisualizationProps) {
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
        No metrics data available
      </div>
    );
  }

  // Calculate aggregated metrics
  const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const totalErrors = metrics.reduce((sum, m) => sum + m.failedRequests, 0);
  const avgResponseTime = metrics.reduce((sum, m) => sum + parseFloat(m.avgResponseTime), 0) / metrics.length;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Overview (Last 24h)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-700 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-blue-900">
            {totalRequests.toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-700 mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-green-900">
            {(100 - errorRate).toFixed(2)}%
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-700 mb-1">Avg Response Time</div>
          <div className="text-2xl font-bold text-yellow-900">
            {avgResponseTime.toFixed(0)}ms
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-700 mb-1">Error Rate</div>
          <div className="text-2xl font-bold text-red-900">
            {errorRate.toFixed(2)}%
          </div>
          <div className="text-xs text-red-600 mt-1">
            {totalErrors.toLocaleString()} errors
          </div>
        </div>
      </div>
    </div>
  );
}
