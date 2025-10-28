/**
 * DEPRECATED ADAPTER: useSimplifiedLoading
 * This file provides backward compatibility for the old useSimplifiedLoading hook
 * Use useLoadingOperation from @shared/core instead
 */

import { useLoadingOperation } from '../core/loading/hooks';
import { LoadingOptions, LoadingResult } from '../core/loading/types';

/**
 * @deprecated Use useLoadingOperation from @shared/core instead
 */
export function useSimplifiedLoading<T = any>(
  operationId: string,
  options: LoadingOptions = {}
): LoadingResult<T> {
  console.warn('useSimplifiedLoading is deprecated. Use useLoadingOperation from @shared/core instead.');
  
  return useLoadingOperation<T>(operationId, options);
}

// Re-export types for backward compatibility
export type { LoadingOptions, LoadingResult } from '../core/loading/types';

// Re-export other hooks for backward compatibility
export {
  usePageLoading,
  useComponentLoading,
  useProgressiveLoading,
  useTimeoutAwareOperation
} from '../core/loading/hooks';

