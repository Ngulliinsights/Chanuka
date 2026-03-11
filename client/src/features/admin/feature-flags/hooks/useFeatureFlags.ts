// ============================================================================
// FEATURE FLAGS HOOKS - React Hooks
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagsApi } from '../api/feature-flags-api';
import type { CreateFlagRequest, UpdateFlagRequest } from '../types';

const QUERY_KEYS = {
  all: ['feature-flags'] as const,
  list: () => [...QUERY_KEYS.all, 'list'] as const,
  detail: (name: string) => [...QUERY_KEYS.all, 'detail', name] as const,
  analytics: (name: string) => [...QUERY_KEYS.all, 'analytics', name] as const,
};

export function useFeatureFlags() {
  return useQuery({
    queryKey: QUERY_KEYS.list(),
    queryFn: () => featureFlagsApi.getAllFlags(),
  });
}

export function useFeatureFlag(name: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(name),
    queryFn: () => featureFlagsApi.getFlag(name),
    enabled: !!name,
  });
}

export function useFlagAnalytics(name: string) {
  return useQuery({
    queryKey: QUERY_KEYS.analytics(name),
    queryFn: () => featureFlagsApi.getAnalytics(name),
    enabled: !!name,
  });
}

export function useCreateFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFlagRequest) => featureFlagsApi.createFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
    },
  });
}

export function useUpdateFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: UpdateFlagRequest }) =>
      featureFlagsApi.updateFlag(name, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.name) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics(variables.name) });
    },
  });
}

export function useDeleteFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => featureFlagsApi.deleteFlag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
    },
  });
}

export function useToggleFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      featureFlagsApi.toggleFlag(name, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.name) });
    },
  });
}

export function useUpdateRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, percentage }: { name: string; percentage: number }) =>
      featureFlagsApi.updateRollout(name, percentage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.name) });
    },
  });
}
