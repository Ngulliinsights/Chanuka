/**
 * useAnalysisHistory Hook
 *
 * React hook for fetching historical analysis data for a bill.
 * Supports pagination and filtering by analysis type.
 */

import { useQuery } from '@tanstack/react-query';
import { analysisApiService } from '../services/analysis-api.service';
import type {
  AnalysisHistoryEntry,
  GetAnalysisHistoryParams,
} from '@shared/types/features/analysis';

interface UseAnalysisHistoryOptions extends GetAnalysisHistoryParams {
  enabled?: boolean;
}

/**
 * Hook to fetch analysis history for a bill
 *
 * @param options - Configuration options including bill ID, pagination, and filters
 * @returns React Query result with history data
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAnalysisHistory({
 *   bill_id: 'bill-123',
 *   limit: 20,
 *   type: 'comprehensive'
 * });
 * ```
 */
export function useAnalysisHistory(
  options: UseAnalysisHistoryOptions
): UseQueryResult<AnalysisHistoryEntry[], Error> {
  const { bill_id, limit = 10, offset = 0, type = 'all', enabled = true } = options;

  return useQuery({
    queryKey: ['analysis', 'history', bill_id, { limit, offset, type }],
    queryFn: () => analysisApiService.getAnalysisHistory({ bill_id, limit, offset, type }),
    enabled: enabled && !!bill_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
