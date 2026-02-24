/**
 * Integration Monitoring API
 * 
 * API client for the monitoring service
 */

import type {
  MonitoringDashboardData,
  IntegrationAlert,
  FeatureMetric,
  IntegrationLog,
} from '../types';

const API_BASE = '/api/monitoring';

// ============================================================================
// DASHBOARD API
// ============================================================================

export async function getDashboardData(): Promise<MonitoringDashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  const data = await response.json();
  
  // Parse dates
  data.features = data.features.map((feature: any) => ({
    ...feature,
    lastHealthCheck: feature.lastHealthCheck ? new Date(feature.lastHealthCheck) : undefined,
    recentMetrics: feature.recentMetrics ? {
      ...feature.recentMetrics,
      timestamp: new Date(feature.recentMetrics.timestamp),
    } : undefined,
  }));
  
  return data;
}

// ============================================================================
// METRICS API
// ============================================================================

export async function getFeatureMetrics(
  featureId: string,
  startTime?: Date,
  endTime?: Date
): Promise<FeatureMetric[]> {
  const params = new URLSearchParams();
  
  if (startTime) {
    params.append('startTime', startTime.toISOString());
  }
  if (endTime) {
    params.append('endTime', endTime.toISOString());
  }
  
  const response = await fetch(
    `${API_BASE}/features/${featureId}/metrics?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch feature metrics');
  }
  
  const data = await response.json();
  
  // Parse dates
  return data.map((metric: any) => ({
    ...metric,
    timestamp: new Date(metric.timestamp),
  }));
}

// ============================================================================
// ALERTS API
// ============================================================================

export async function getFeatureAlerts(
  featureId: string,
  resolved?: boolean
): Promise<IntegrationAlert[]> {
  const params = new URLSearchParams();
  
  if (resolved !== undefined) {
    params.append('resolved', resolved.toString());
  }
  
  const response = await fetch(
    `${API_BASE}/features/${featureId}/alerts?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch feature alerts');
  }
  
  const data = await response.json();
  
  // Parse dates
  return data.map((alert: any) => ({
    ...alert,
    created_at: new Date(alert.created_at),
    updated_at: new Date(alert.updated_at),
    acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
    resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
  }));
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to acknowledge alert');
  }
}

export async function resolveAlert(alertId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to resolve alert');
  }
}

// ============================================================================
// LOGS API
// ============================================================================

export async function getFeatureLogs(
  featureId: string,
  level?: string,
  limit?: number
): Promise<IntegrationLog[]> {
  const params = new URLSearchParams();
  
  if (level) {
    params.append('level', level);
  }
  if (limit) {
    params.append('limit', limit.toString());
  }
  
  const response = await fetch(
    `${API_BASE}/features/${featureId}/logs?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch feature logs');
  }
  
  const data = await response.json();
  
  // Parse dates
  return data.map((log: any) => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }));
}

// ============================================================================
// HEALTH CHECK API
// ============================================================================

export async function getSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  totalFeatures: number;
  healthyFeatures: number;
  degradedFeatures: number;
  downFeatures: number;
  totalAlerts: number;
  criticalAlerts: number;
  timestamp: Date;
}> {
  const response = await fetch(`${API_BASE}/health`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch system health');
  }
  
  const data = await response.json();
  
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}
