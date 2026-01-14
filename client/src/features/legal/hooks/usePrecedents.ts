/**
 * usePrecedents Hook
 * 
 * Fetches legal precedents related to a bill
 * Uses React Query for caching (20 minute TTL - precedents change rarely)
 */

import { useQuery } from '@tanstack/react-query';

export interface LegalPrecedent {
  id: string;
  analysis_id: string;
  bill_id: string;
  case_name: string;
  citation: string;
  year: number;
  relevance_level: string;
  holding_summary: string;
  full_text?: string;
  created_at: string;
}

export function usePrecedents(billId: string) {
  return useQuery<LegalPrecedent[]>({
    queryKey: ['precedents', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/precedents`);
      if (!response.ok) throw new Error('Failed to fetch precedents');
      return response.json();
    },
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 40 * 60 * 1000, // 40 minutes
  });
}
