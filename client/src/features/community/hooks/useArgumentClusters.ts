/**
 * Hook: useArgumentClusters
 * 
 * Fetches clustered/grouped arguments for a bill
 * Part of argument-intelligence feature integration with community
 */

import { useQuery } from '@tanstack/react-query';

import type { ArgumentCluster } from '@client/lib/types';

export function useArgumentClusters(billId: string) {
  return useQuery({
    queryKey: ['argument-clusters', billId],
    queryFn: async () => {
      const response = await fetch(`/api/argument-intelligence/bill/${billId}/clusters`);
      if (!response.ok) throw new Error('Failed to fetch argument clusters');
      const data = await response.json();
      return data.clusters as ArgumentCluster[];
    },
    enabled: !!billId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}
