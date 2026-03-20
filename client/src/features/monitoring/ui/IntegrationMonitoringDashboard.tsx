/**
 * Integration Monitoring Dashboard
 * 
 * Main dashboard for monitoring all integrated features
 */

import { useState } from 'react';
import { useDashboardData } from '../hooks/use-monitoring';
import { HealthStatusDisplay } from './HealthStatusDisplay';
import { MetricsVisualization } from './MetricsVisualization';
import { AlertManagement } from './AlertManagement';
import { FeatureUsageCharts } from './FeatureUsageCharts';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ErrorTrackingDisplay } from './ErrorTrackingDisplay';
import type { IntegrationFeature } from '../types';

export function IntegrationMonitoringDashboard() {
  const { data, isLoading, error, refetch } = useDashboardData();
  const [selectedFeature, setSelectedFeature] = useState<IntegrationFeature | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'logs'>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-2">Failed to load dashboard</p>
          <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Integration Monitoring</h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitor all integrated features in real-time
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Features</p>
                <p className="text-3xl font-bold text-gray-900">{data.systemHealth.totalFeatures}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy</p>
                <p className="text-3xl font-bold text-green-600">{data.systemHealth.healthyFeatures}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Degraded/Down</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {data.systemHealth.degradedFeatures + data.systemHealth.downFeatures}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-3xl font-bold text-red-600">{data.systemHealth.totalAlerts}</p>
                {data.systemHealth.criticalAlerts > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {data.systemHealth.criticalAlerts} critical
                  </p>
                )}
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Features</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {data.features.map((feature) => (
              <div
                key={feature.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedFeature(feature)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <HealthStatusDisplay status={feature.healthStatus} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{feature.displayName}</h3>
                      <p className="text-xs text-gray-500">{feature.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {feature.recentMetrics && (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Requests</p>
                          <p className="text-sm font-medium text-gray-900">
                            {feature.recentMetrics.totalRequests.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Error Rate</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(parseFloat(feature.recentMetrics.errorRate) * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Avg Response</p>
                          <p className="text-sm font-medium text-gray-900">
                            {parseFloat(feature.recentMetrics.avgResponseTime).toFixed(0)}ms
                          </p>
                        </div>
                      </>
                    )}
                    {feature.activeAlerts > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">{feature.activeAlerts}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Detail Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedFeature.displayName}</h2>
                <p className="text-sm text-gray-500">{selectedFeature.name}</p>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px px-6">
                {(['overview', 'metrics', 'alerts', 'logs'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <MetricsVisualization featureId={selectedFeature.id} />
                  <FeatureUsageCharts featureId={selectedFeature.id} />
                </div>
              )}
              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  <PerformanceMetrics featureId={selectedFeature.id} />
                  <ErrorTrackingDisplay featureId={selectedFeature.id} />
                </div>
              )}
              {activeTab === 'alerts' && (
                <AlertManagement featureId={selectedFeature.id} />
              )}
              {activeTab === 'logs' && (
                <div className="text-gray-600">Logs display coming soon...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
