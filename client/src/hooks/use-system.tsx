import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@client/services/api';
import { logger } from '@client/utils/logger';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['system', 'stats'],
    queryFn: () => systemApi.getStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useSystemActivity() {
  return useQuery({
    queryKey: ['system', 'activity'],
    queryFn: () => systemApi.getActivity(),
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

