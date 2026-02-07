/**
 * System Hooks - Optimized with React Query
 * Provides system-level information and health monitoring
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { globalApiClient } from '@client/core/api/client';
import { logger } from '@client/lib/utils/logger';

// Types
export interface SystemHealth {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
  lastCheck: number;
}

export interface SystemStats {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    navigation: PerformanceNavigationTiming | null;
    resource: PerformanceResourceTiming[] | null;
  };
  connection: {
    type: string;
    effectiveType: string;
    downlink: number;
  };
}

export interface SystemActivity {
  activeRequests: number;
  lastActivity: number;
  isIdle: boolean;
}

export interface SystemSchema {
  version: string;
  features: string[];
  capabilities: string[];
}

export interface SystemEnvironment {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
}

// Query keys for easy invalidation
export const systemKeys = {
  all: ['system'] as const,
  health: () => [...systemKeys.all, 'health'] as const,
  stats: () => [...systemKeys.all, 'stats'] as const,
  activity: () => [...systemKeys.all, 'activity'] as const,
  schema: () => [...systemKeys.all, 'schema'] as const,
  environment: () => [...systemKeys.all, 'environment'] as const,
};

// Custom hook options
interface SystemQueryOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Monitor system health
 * Default: Refetch every 30 seconds
 */
export function useSystemHealth(options?: SystemQueryOptions) {
  return useQuery({
    queryKey: systemKeys.health(),
    queryFn: async () => {
      try {
        const response = await globalApiClient.get<SystemHealth>('/system/health');
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch system health', { error, component: 'useSystemHealth' });
        throw error;
      }
    },
    refetchInterval: options?.refetchInterval ?? 30000,
    enabled: options?.enabled ?? true,
    staleTime: 20000, // Consider fresh for 20s
    retry: 2,
  });
}

/**
 * Get system performance statistics
 * Default: Refetch every 60 seconds
 */
export function useSystemStats(options?: SystemQueryOptions) {
  return useQuery({
    queryKey: systemKeys.stats(),
    queryFn: async () => {
      try {
        const response = await globalApiClient.get<SystemStats>('/system/stats');
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch system stats', { error, component: 'useSystemStats' });
        throw error;
      }
    },
    refetchInterval: options?.refetchInterval ?? 60000,
    enabled: options?.enabled ?? true,
    staleTime: 45000,
    retry: 2,
  });
}

/**
 * Track system activity
 * Default: Refetch every 30 seconds
 */
export function useSystemActivity(options?: SystemQueryOptions) {
  return useQuery({
    queryKey: systemKeys.activity(),
    queryFn: async () => {
      try {
        const response = await globalApiClient.get<SystemActivity>('/system/activity');
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch system activity', { error, component: 'useSystemActivity' });
        throw error;
      }
    },
    refetchInterval: options?.refetchInterval ?? 30000,
    enabled: options?.enabled ?? true,
    staleTime: 20000,
    retry: 2,
  });
}

/**
 * Get system schema and capabilities
 * Default: No refetch (static data)
 */
export function useSystemSchema(options?: SystemQueryOptions) {
  return useQuery({
    queryKey: systemKeys.schema(),
    queryFn: async () => {
      try {
        const response = await globalApiClient.get<SystemSchema>('/system/schema');
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch system schema', { error, component: 'useSystemSchema' });
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: Infinity, // Schema rarely changes
    retry: 1,
  });
}

/**
 * Get system environment information
 * Default: No refetch (static data)
 */
export function useSystemEnvironment(options?: SystemQueryOptions) {
  return useQuery({
    queryKey: systemKeys.environment(),
    queryFn: async () => {
      try {
        const response = await globalApiClient.get<SystemEnvironment>('/system/environment');
        return response.data;
      } catch (error) {
        logger.error('Failed to fetch system environment', { error, component: 'useSystemEnvironment' });
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: Infinity, // Environment info is static
    retry: 1,
  });
}

/**
 * Composite hook for complete system overview
 * Use when you need all system data at once
 */
export function useSystemOverview(options?: SystemQueryOptions) {
  const health = useSystemHealth(options);
  const stats = useSystemStats(options);
  const activity = useSystemActivity(options);
  const schema = useSystemSchema(options);
  const environment = useSystemEnvironment(options);

  return {
    health: health.data,
    stats: stats.data,
    activity: activity.data,
    schema: schema.data,
    environment: environment.data,
    isLoading: health.isLoading || stats.isLoading || activity.isLoading || schema.isLoading || environment.isLoading,
    isError: health.isError || stats.isError || activity.isError || schema.isError || environment.isError,
    error: health.error || stats.error || activity.error || schema.error || environment.error,
  };
}

/**
 * Legacy useSystem hook for backward compatibility
 * @deprecated Use useSystemOverview instead
 */
export function useSystem(options?: SystemQueryOptions) {
  return useSystemOverview(options);
}
