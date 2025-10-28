/**
 * Cross-Environment Performance Insights Dashboard
 *
 * React component that displays unified performance metrics across environments
 * with real-time insights, trends, and actionable recommendations.
 */

import React, { useState, useEffect, useMemo } from 'react';

// Define types locally to avoid import issues
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface BudgetViolation {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  timestamp: number;
}

interface PerformanceInsight {
  type: 'bottleneck' | 'improvement' | 'trend' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedComponents: string[];
  suggestedActions: string[];
  data: Record<string, any>;
}

interface EnvironmentPerformanceReport {
  environment: string;
  timestamp: number;
  clientMetrics: PerformanceMetric[];
  serverMetrics: PerformanceMetric[];
  methodStats: any[];
  violations: BudgetViolation[];
  healthScore: number;
  insights: PerformanceInsight[];
  recommendations: string[];
}

interface CrossEnvironmentComparison {
  timestamp: number;
  environments: string[];
  kpis: {
    avgResponseTime: Record<string, number>;
    errorRate: Record<string, number>;
    throughput: Record<string, number>;
    resourceUtilization: Record<string, number>;
  };
  differences: {
    bestEnvironment: string;
    worstEnvironment: string;
    gaps: Record<string, number>;
  };
  recommendations: string[];
}

class UnifiedPerformanceMonitoringService {
  generateEnvironmentReport(environment?: string): EnvironmentPerformanceReport {
    // Mock implementation - in real app this would connect to actual monitoring service
    return {
      environment: environment || 'development',
      timestamp: Date.now(),
      clientMetrics: [],
      serverMetrics: [],
      methodStats: [],
      violations: [],
      healthScore: 85,
      insights: [],
      recommendations: [],
    };
  }

  generateCrossEnvironmentComparison(environments: string[]): CrossEnvironmentComparison {
    // Mock implementation
    return {
      timestamp: Date.now(),
      environments,
      kpis: {
        avgResponseTime: {},
        errorRate: {},
        throughput: {},
        resourceUtilization: {},
      },
      differences: {
        bestEnvironment: environments[0] || 'development',
        worstEnvironment: environments[environments.length - 1] || 'production',
        gaps: {},
      },
      recommendations: [],
    };
  }
}

interface PerformanceDashboardProps {
  /** Environments to monitor */
  environments?: string[];
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface DashboardState {
  reports: Map<string, EnvironmentPerformanceReport>;
  comparison: CrossEnvironmentComparison | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  environments = ['development', 'staging', 'production'],
  refreshInterval = 30000, // 30 seconds
  showDetails = true,
  className = '',
}) => {
  const [state, setState] = useState<DashboardState>({
    reports: new Map(),
    comparison: null,
    loading: true,
    error: null,
    lastUpdate: 0,
  });

  // Create unified monitoring service instance
  const monitor = useMemo(() => new UnifiedPerformanceMonitoringService(), []);

  // Load performance data
  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Generate reports for all environments
      const reports = new Map<string, EnvironmentPerformanceReport>();
      for (const env of environments) {
        const report = monitor.generateEnvironmentReport(env);
        reports.set(env, report);
      }

      // Generate cross-environment comparison
      const comparison = monitor.generateCrossEnvironmentComparison(environments);

      setState({
        reports,
        comparison,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load performance data',
      }));
    }
  };

  // Auto-refresh data
  useEffect(() => {
    loadData();

    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [environments, refreshInterval]);

  // Calculate overall health score
  const overallHealthScore = useMemo(() => {
    if (state.reports.size === 0) return 0;

    const scores = Array.from(state.reports.values()).map(r => r.healthScore);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [state.reports]);

  // Get critical insights
  const criticalInsights = useMemo(() => {
    const insights: PerformanceInsight[] = [];
    state.reports.forEach(report => {
      insights.push(...report.insights.filter(i => i.severity === 'critical'));
    });
    return insights;
  }, [state.reports]);

  // Get health score color
  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (state.loading && state.reports.size === 0) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Performance Dashboard Error</h3>
          <p>{state.error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Insights Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Cross-environment performance monitoring and analysis
          </p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreColor(overallHealthScore)}`}>
            Overall Health: {overallHealthScore.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(state.lastUpdate).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Critical Insights Alert */}
      {criticalInsights.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Critical Performance Issues Detected
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {criticalInsights.slice(0, 3).map((insight, index) => (
                    <li key={index}>{insight.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Environment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {environments.map(env => {
          const report = state.reports.get(env);
          if (!report) return null;

          return (
            <div key={env} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{env}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthScoreColor(report.healthScore)}`}>
                  {report.healthScore.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Client Metrics</span>
                  <span className="font-medium">{report.clientMetrics.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Server Metrics</span>
                  <span className="font-medium">{report.serverMetrics.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Violations</span>
                  <span className={`font-medium ${report.violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {report.violations.length}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Environment Comparison */}
      {state.comparison && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Comparison</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {state.comparison.differences.bestEnvironment}
                </div>
                <div className="text-sm text-gray-600">Best Performance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {state.comparison.differences.worstEnvironment}
                </div>
                <div className="text-sm text-gray-600">Needs Attention</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.max(...Object.values(state.comparison.differences.gaps) as number[]).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Max Gap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {state.comparison.recommendations.length}
                </div>
                <div className="text-sm text-gray-600">Recommendations</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Insights */}
      {showDetails && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>

          {Array.from(state.reports.entries()).map(([env, report]) => (
            <div key={env} className="border rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 capitalize mb-3">{env} Environment</h4>

              {report.insights.length > 0 ? (
                <div className="space-y-3">
                  {report.insights.map((insight, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{insight.title}</h5>
                          <p className="text-sm mt-1">{insight.description}</p>
                          {insight.affectedComponents.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-medium">Affected: </span>
                              <span className="text-xs">{insight.affectedComponents.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getSeverityColor(insight.severity)}`}>
                          {insight.severity}
                        </span>
                      </div>

                      {insight.suggestedActions.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium">Recommendations:</span>
                          <ul className="text-xs mt-1 list-disc list-inside">
                            {insight.suggestedActions.slice(0, 2).map((action, actionIndex) => (
                              <li key={actionIndex}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No performance insights available</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {state.comparison?.recommendations && state.comparison.recommendations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Recommendations</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2">
              {state.comparison.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-800">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadData}
          disabled={state.loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};

export default PerformanceDashboard;

