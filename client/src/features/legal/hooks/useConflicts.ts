/**
 * useConflicts Hook
 * 
 * Fetches all constitutional conflicts for a specific bill
 * Uses React Query for caching (10 minute TTL)
 */

import { useQuery } from '@tanstack/react-query';

export interface ConstitutionalConflict {
  id: string;
  analysis_id: string;
  bill_id: string;
  constitutional_provision: string;
  bill_language: string;
  conflict_description: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  suggested_amendment?: string;
  created_at: string;
}

export function useConflicts(billId: string) {
  return useQuery<ConstitutionalConflict[]>({
    queryKey: ['conflicts', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/conflicts`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
}
