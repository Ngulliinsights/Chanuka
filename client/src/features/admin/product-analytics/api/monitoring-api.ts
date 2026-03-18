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
import { apiFetchClient } from '@client/infrastructure/api/response-handler';

const API_BASE = '/api/monitoring';

// ============================================================================
// DASHBOARD API
// ============================================================================

export async function getDashboardData(): Promise<MonitoringDashboardData> {
  const data = await apiFetchClient.get<MonitoringDashboardData>(`${API_BASE}/dashboard`);

  // Parse dates
  (data as any).features = (data as any).features.map((feature: unknown) => ({
    ...feature,
    lastHealthCheck: (feature as any).lastHealthCheck
      ? new Date((feature as any).lastHealthCheck)
      : undefined,
    recentMetrics: (feature as any).recentMetrics
      ? {
          ...(feature as any).recentMetrics,
          timestamp: new Date((feature as any).recentMetrics.timestamp),
        }
      : undefined,
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

  const data = await apiFetchClient.get<FeatureMetric[]>(
    `${API_BASE}/features/${featureId}/metrics?${params.toString()}`
  );

  // Parse dates
  return data.map((metric: unknown) => ({
    ...metric,
    timestamp: new Date((metric as any).timestamp),
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

  const data = await apiFetchClient.get<IntegrationAlert[]>(
    `${API_BASE}/features/${featureId}/alerts?${params.toString()}`
  );

  // Parse dates
  return data.map((alert: unknown) => ({
    ...alert,
    created_at: new Date(alert.created_at),
    updated_at: new Date(alert.updated_at),
    acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
    resolvedAt: (alert as any).resolvedAt ? new Date((alert as any).resolvedAt) : undefined,
  }));

  return data;
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiFetchClient.put(`${API_BASE}/alerts/${alertId}/acknowledge`, {});
}

export async function resolveAlert(alertId: string): Promise<void> {
  await apiFetchClient.put(`${API_BASE}/alerts/${alertId}/resolve`, {});
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

  const data = await apiFetchClient.get<IntegrationLog[]>(
    `${API_BASE}/features/${featureId}/logs?${params.toString()}`
  );

  // Parse dates
  return data.map((log: unknown) => ({
    ...log,
    timestamp: new Date((log as any).timestamp),
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
  const data = await apiFetchClient.get<any>(`${API_BASE}/health`);

  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}
