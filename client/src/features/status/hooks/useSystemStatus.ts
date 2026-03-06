/**
 * useSystemStatus Hook
 * Integrates system status service with React component lifecycle
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { createQueryErrorHandler, createMutationErrorHandler } from '@client/infrastructure/error';
import { statusService } from '../services/status';
import { useEffect, useState } from 'react';

export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: () => statusService.fetchSystemStatus(),
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000,
    ...createQueryErrorHandler(),
  });
};

export const useStatusSubscription = (onUpdate: (status: unknown) => void) => {
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const subscribe = async () => {
      const unsub = await statusService.subscribeToStatusUpdates((status) => {
        if (isMounted) {
          onUpdate(status);
        }
      });
      if (isMounted) {
        setUnsubscribe(() => unsub);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [onUpdate]);
};

export const useIncidentReport = () => {
  return useMutation({
    mutationFn: ({ title, services }: { title: string; services: string[] }) =>
      statusService.reportIncident(title, services),
    ...createMutationErrorHandler(),
  });
};

export const useIncidentHistory = (days: number = 30) => {
  return useQuery({
    queryKey: ['incident-history', days],
    queryFn: () => statusService.getIncidentHistory(days),
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...createQueryErrorHandler(),
  });
};
