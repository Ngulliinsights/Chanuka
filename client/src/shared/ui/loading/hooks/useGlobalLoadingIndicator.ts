/**
 * Hook for controlling the global loading indicator
 *
 * This hook provides a simple interface for showing/hiding the global loading
 * indicator and integrates with the existing Redux-based loading system.
 */

import { useCallback } from 'react';

import { useGlobalLoading } from '../GlobalLoadingProvider';
import { LoadingOperation, LoadingPriority, LoadingType } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ShowLoadingOptions {
  message?: string;
  priority?: LoadingPriority;
  type?: LoadingType;
  timeout?: number;
  maxRetries?: number;
}

export interface UseGlobalLoadingIndicatorReturn {
  /** Show the loading indicator with optional configuration */
  show: (options?: ShowLoadingOptions) => Promise<string>;
  /** Hide a specific loading operation */
  hide: (operationId: string) => Promise<void>;
  /** Check if any loading operations are active */
  isLoading: boolean;
  /** Get count of active operations */
  activeCount: number;
  /** Whether the global loader should be shown */
  shouldShow: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for controlling global loading indicator
 *
 * Provides a simplified interface for showing/hiding loading states
 * that integrates with the existing Redux-based loading system.
 *
 * @example
 * ```tsx
 * const { show, hide, isLoading } = useGlobalLoadingIndicator();
 *
 * // Show loading
 * const operationId = await show({
 *   message: 'Saving data...',
 *   priority: 'high'
 * });
 *
 * // Hide when done
 * await hide(operationId);
 * ```
 */
export const useGlobalLoadingIndicator = (): UseGlobalLoadingIndicatorReturn => {
  const { startOperation, completeOperation, activeOperationsCount, shouldShowGlobalLoader } =
    useGlobalLoading();

  /**
   * Show the loading indicator with optional configuration
   */
  const show = useCallback(
    async (options: ShowLoadingOptions = {}): Promise<string> => {
      const {
        message = 'Loading...',
        priority = 'medium',
        type = 'progressive',
        timeout = 30000,
        maxRetries = 3,
      } = options;

      const operation: Omit<LoadingOperation, 'startTime' | 'retryCount'> = {
        id: `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        priority,
        timeout,
        maxRetries,
        progress: 0,
      };

      return await startOperation(operation);
    },
    [startOperation]
  );

  /**
   * Hide a specific loading operation
   */
  const hide = useCallback(
    async (operationId: string): Promise<void> => {
      await completeOperation(operationId, true);
    },
    [completeOperation]
  );

  return {
    show,
    hide,
    isLoading: activeOperationsCount > 0,
    activeCount: activeOperationsCount,
    shouldShow: shouldShowGlobalLoader,
  };
};

export default useGlobalLoadingIndicator;
