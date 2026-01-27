/**
 * Hook: useLegislativeBrief
 * 
 * Fetches the AI-generated legislative brief synthesizing all arguments on a bill
 * Part of argument-intelligence feature integration with community
 */

import { useQuery } from '@tanstack/react-query';

import type { LegislativeBrief } from '@/server/features/argument-intelligence';

export function useLegislativeBrief(billId: string) {
  return useQuery({
    queryKey: ['legislative-brief', billId],
    queryFn: async () => {
      const response = await fetch(`/api/argument-intelligence/bill/${billId}/brief`);
      if (!response.ok) throw new Error('Failed to fetch legislative brief');
      const data = await response.json();
      return data.brief as LegislativeBrief;
    },
    enabled: !!billId,
    staleTime: 15 * 60 * 1000 // 15 minutes
  });
}
