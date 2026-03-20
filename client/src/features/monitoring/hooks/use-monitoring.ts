/**
 * Monitoring Hooks
 * 
 * React hooks for monitoring data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardData,
  getFeatureMetrics,
  getFeatureAlerts,
  getFeatureLogs,
  getSystemHealth,
  acknowledgeAlert,
  resolveAlert,
} from '../api/monitoring-api';

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export function useDashboardData(refreshInterval = 30000) {
  return useQuery({
    queryKey: ['monitoring', 'dashboard'],
    queryFn: getDashboardData,
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });
}

export function useSystemHealth(refreshInterval = 30000) {
  return useQuery({
    queryKey: ['monitoring', 'health'],
    queryFn: getSystemHealth,
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });
}

// ============================================================================
// METRICS HOOKS
// ============================================================================

export function useFeatureMetrics(
  featureId: string,
  startTime?: Date,
  endTime?: Date,
  enabled = true
) {
  return useQuery({
    queryKey: ['monitoring', 'metrics', featureId, startTime, endTime],
    queryFn: () => getFeatureMetrics(featureId, startTime, endTime),
    enabled,
    staleTime: 60000,
  });
}

// ============================================================================
// ALERTS HOOKS
// ============================================================================

export function useFeatureAlerts(featureId: string, resolved?: boolean) {
  return useQuery({
    queryKey: ['monitoring', 'alerts', featureId, resolved],
    queryFn: () => getFeatureAlerts(featureId, resolved),
    staleTime: 30000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'dashboard'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'dashboard'] });
    },
  });
}

// ============================================================================
// LOGS HOOKS
// ============================================================================

export function useFeatureLogs(
  featureId: string,
  level?: string,
  limit?: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['monitoring', 'logs', featureId, level, limit],
    queryFn: () => getFeatureLogs(featureId, level, limit),
    enabled,
    staleTime: 30000,
  });
}
