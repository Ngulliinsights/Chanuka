import { useQuery } from '@tanstack/react-query';

import { globalApiClient } from '@client/core/api/client';
import { logger } from '@client/utils/logger';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => globalApiClient.get('/system/health'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['system', 'stats'],
    queryFn: () => globalApiClient.get('/system/stats'),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useSystemActivity() {
  return useQuery({
    queryKey: ['system', 'activity'],
    queryFn: () => globalApiClient.get('/system/activity'),
    refetchInterval: 30000,
  });
}

export function useSystemSchema() {
  return useQuery({
    queryKey: ['system', 'schema'],
    queryFn: () => systemApi.getSchema(),
  });
}

export function useSystemEnvironment() {
  return useQuery({
    queryKey: ['system', 'environment'],
    queryFn: () => systemApi.getEnvironment(),
  });
}
