/**
 * useComprehensiveAnalysis Hook
 * 
 * React hook for fetching and managing comprehensive bill analysis data.
 * Integrates with React Query for caching and automatic refetching.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { analysisApiService } from '../services/analysis-api.service';
import type { ComprehensiveBillAnalysis } from '@shared/types/features/analysis';

interface UseComprehensiveAnalysisOptions {
  billId: string;
  force?: boolean;
  enabled?: boolean;
}

/**
 * Hook to fetch comprehensive analysis for a bill
 * 
 * @param options - Configuration options including bill ID and force flag
 * @returns React Query result with analysis data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useComprehensiveAnalysis({
 *   billId: 'bill-123',
 *   force: false
 * });
 * ```
 */
export function useComprehensiveAnalysis(
  options: UseComprehensiveAnalysisOptions
): UseQueryResult<ComprehensiveBillAnalysis, Error> {
  const { billId, force = false, enabled = true } = options;

  return useQuery({
    queryKey: ['analysis', 'comprehensive', billId, { force }],
    queryFn: () => analysisApiService.getComprehensiveAnalysis({ bill_id: billId, force }),
    enabled: enabled && !!billId,
    staleTime: force ? 0 : 5 * 60 * 1000, // 5 minutes unless forced
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}
