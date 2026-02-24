/**
 * Feature Usage Charts Component
 * 
 * Displays usage charts for a feature
 */

import { useFeatureMetrics } from '../hooks/useMonitoring';

interface FeatureUsageChartsProps {
  featureId: string;
}

export function FeatureUsageCharts({ featureId }: FeatureUsageChartsProps) {
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
        No usage data available
      </div>
    );
  }

  // Calculate max values for scaling
  const maxRequests = Math.max(...metrics.map(m => m.totalRequests));
  const maxUsers = Math.max(...metrics.map(m => m.activeUsers));

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends (Last 24h)</h3>
      
      {/* Requests Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Total Requests</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-end gap-1 h-32">
            {metrics.map((metric, index) => {
              const height = maxRequests > 0 ? (metric.totalRequests / maxRequests) * 100 : 0;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {metric.totalRequests.toLocaleString()} requests
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

      {/* Active Users Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Active Users</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-end gap-1 h-32">
            {metrics.map((metric, index) => {
              const height = maxUsers > 0 ? (metric.activeUsers / maxUsers) * 100 : 0;
              return (
                <div
                  key={index}
                  className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {metric.activeUsers.toLocaleString()} users
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

      {/* Success Rate Chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Success Rate</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-end gap-1 h-32">
            {metrics.map((metric, index) => {
              const successRate = metric.totalRequests > 0
                ? ((metric.successfulRequests / metric.totalRequests) * 100)
                : 100;
              const height = successRate;
              const color = successRate >= 95 ? 'bg-green-500 hover:bg-green-600' : 
                           successRate >= 90 ? 'bg-yellow-500 hover:bg-yellow-600' : 
                           'bg-red-500 hover:bg-red-600';
              return (
                <div
                  key={index}
                  className={`flex-1 ${color} rounded-t transition-colors relative group`}
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {successRate.toFixed(2)}% success
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
    </div>
  );
}
