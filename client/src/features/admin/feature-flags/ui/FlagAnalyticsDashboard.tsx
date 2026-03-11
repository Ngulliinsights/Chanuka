// ============================================================================
// ANALYTICS DASHBOARD - Display feature flag analytics
// ============================================================================

import React from 'react';
import { useFlagAnalytics } from '../hooks/useFeatureFlags';

interface AnalyticsDashboardProps {
  flagName: string;
  onClose: () => void;
}

export function AnalyticsDashboard({ flagName, onClose }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading, error } = useFlagAnalytics(flagName);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-red-600">Failed to load analytics</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Analytics: {analytics.flagName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  analytics.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {analytics.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="text-sm text-gray-600">
                Rollout: {analytics.rolloutPercentage}%
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-700 mb-1">Total Evaluations</div>
              <div className="text-3xl font-bold text-blue-900">
                {analytics.totalEvaluations.toLocaleString()}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-700 mb-1">Enabled Count</div>
              <div className="text-3xl font-bold text-green-900">
                {analytics.enabledCount.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {analytics.enabledPercentage.toFixed(1)}% of evaluations
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Disabled Count</div>
              <div className="text-3xl font-bold text-gray-900">
                {analytics.disabledCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {(100 - analytics.enabledPercentage).toFixed(1)}% of evaluations
              </div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Evaluation Distribution</div>
            <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${analytics.enabledPercentage}%` }}
              >
                {analytics.enabledPercentage > 10 && `${analytics.enabledPercentage.toFixed(1)}%`}
              </div>
              <div
                className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${100 - analytics.enabledPercentage}%` }}
              >
                {100 - analytics.enabledPercentage > 10 && `${(100 - analytics.enabledPercentage).toFixed(1)}%`}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Enabled</span>
              <span>Disabled</span>
            </div>
          </div>

          {/* Additional Metrics */}
          {analytics.metrics && Object.keys(analytics.metrics).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 overflow-x-auto">
                  {JSON.stringify(analytics.metrics, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
