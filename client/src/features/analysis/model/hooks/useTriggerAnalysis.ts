/**
 * useTriggerAnalysis Hook
 *
 * React hook for triggering new comprehensive analysis runs (admin only).
 * Uses React Query mutation for optimistic updates and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApiService } from '../services/analysis-api.service';
import type {
  ComprehensiveBillAnalysis,
  TriggerAnalysisParams,
} from '@shared/types/features/analysis';
import { logger } from '@client/lib/utils/logger';

/**
 * Hook to trigger a new analysis run
 *
 * @returns React Query mutation result
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useTriggerAnalysis();
 *
 *  * };
 * ```
 */
export function useTriggerAnalysis(): UseMutationResult<
  ComprehensiveBillAnalysis,
  Error,
  TriggerAnalysisParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TriggerAnalysisParams) => analysisApiService.triggerAnalysis(params),
    onSuccess: (data, variables) => {
      logger.info(`Analysis triggered successfully for bill ${variables.bill_id}`);

      // Invalidate and refetch comprehensive analysis
      queryClient.invalidateQueries({
        queryKey: ['analysis', 'comprehensive', variables.bill_id],
      });

      // Invalidate analysis history
      queryClient.invalidateQueries({
        queryKey: ['analysis', 'history', variables.bill_id],
      });
    },
    onError: (error, variables) => {
      logger.error(`Failed to trigger analysis for bill ${variables.bill_id}`, { error });
    },
  });
}
