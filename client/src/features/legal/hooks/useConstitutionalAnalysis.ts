/**
 * useConstitutionalAnalysis Hook
 * 
 * Fetches constitutional analysis data for a specific bill
 * Uses React Query for caching (15 minute TTL)
 */

import { useQuery } from '@tanstack/react-query';

interface ConstitutionalAnalysis {
  id: string;
  bill_id: string;
  alignment_score: number;
  legal_risk_level: string;
  total_conflicts: number;
  critical_conflicts: number;
  moderate_conflicts: number;
  executive_summary: string;
}

export function useConstitutionalAnalysis(billId: string) {
  return useQuery<ConstitutionalAnalysis>({
    queryKey: ['constitutionalAnalysis', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/constitutional-analysis`);
      if (!response.ok) throw new Error('Failed to fetch constitutional analysis');
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
