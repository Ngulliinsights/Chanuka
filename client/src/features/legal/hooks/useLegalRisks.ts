/**
 * useLegalRisks Hook
 * 
 * Fetches legal risks and mitigation strategies for a bill
 * Uses React Query for caching (10 minute TTL)
 */

import { useQuery } from '@tanstack/react-query';

export interface LegalRisk {
  id: string;
  analysis_id: string;
  bill_id: string;
  risk_category: string;
  risk_title: string;
  risk_description: string;
  probability_percentage: number;
  impact_percentage: number;
  mitigation_strategy: string;
  created_at: string;
}

export function useLegalRisks(billId: string) {
  return useQuery<LegalRisk[]>({
    queryKey: ['legalRisks', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/legal-risks`);
      if (!response.ok) throw new Error('Failed to fetch legal risks');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
}
