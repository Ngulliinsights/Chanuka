/**
 * Hook: useArgumentsForBill
 * 
 * Fetches all arguments extracted from comments for a specific bill
 * Part of argument-intelligence feature integration with community
 */

import { useQuery } from '@tanstack/react-query';
import type { Argument } from '@/server/features/argument-intelligence';

export function useArgumentsForBill(billId: string) {
  return useQuery({
    queryKey: ['arguments', billId],
    queryFn: async () => {
      const response = await fetch(`/api/argument-intelligence/bill/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch arguments');
      const data = await response.json();
      return data.arguments as Argument[];
    },
    enabled: !!billId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
