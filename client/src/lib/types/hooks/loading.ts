/**
 * Loading Hook Types - STANDARDIZED
 *
 * Standardized hook return types following the exemplary pattern from loading.ts
 * Key improvements:
 * - Consistent naming conventions
 * - Proper generic typing
 * - Comprehensive documentation
 * - Immutable return types where appropriate
 */

// ============================================================================
// Loading Hook Return Types
// ============================================================================

/**
 * Result type for useLoading hook
 * Generic type T represents the expected data type
 * Follows the pattern from LoadingResult in loading.ts
 */
export interface UseLoadingResult<T = unknown> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isTimeout: boolean;
  isCancelled: boolean;
  retryCount: number;
  timeElapsed: number;
  estimatedTimeRemaining: number | null;
  progress: number | null;
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
}

/**
 * Result type for useProgressiveLoading hook
 * Standardized from ProgressiveLoadingResult in loading.ts
 */
export interface UseProgressiveLoadingResult {
  currentStage: {
    id: string;
    message: string;
    duration?: number;
    progress?: number;
    retryable?: boolean;
  } | null;
  currentStageIndex: number;
  progress: number;
  stageProgress: number;
  state: 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'cancelled';
  error: Error | null;
  completedStages: readonly string[];
  failedStages: readonly string[];
  skippedStages: readonly string[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  canRetry: boolean;
  canSkip: boolean;
  isComplete: boolean;
  isFirstStage: boolean;
  isLastStage: boolean;
  start: () => void;
  nextStage: () => void;
  previousStage: () => void;
  goToStage: (index: number) => void;
  setStageProgress: (progress: number) => void;
  completeCurrentStage: () => void;
  failCurrentStage: (error: Error | string) => void;
  skipCurrentStage: (reason?: string) => void;
  retryCurrentStage: () => void;
  reset: () => void;
}

/**
 * Result type for useTimeoutAwareLoading hook
 * Standardized from TimeoutAwareLoadingResult in loading.ts
 */
export interface UseTimeoutAwareLoadingResult {
  state: 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'cancelled';
  isLoading: boolean;
  isTimeout: boolean;
  isWarning: boolean;
  error: Error | null;
  elapsedTime: number;
  remainingTime: number;
  timeoutDuration: number;
  warningThreshold: number;
  elapsedTimeFormatted: string;
  remainingTimeFormatted: string;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  start: (timeout?: number) => void;
  stop: () => void;
  reset: () => void;
  retry: () => void;
  extendTimeout: (additionalTime: number) => void;
  withTimeout: <T>(asyncFn: () => Promise<T>, timeout?: number) => Promise<T>;
}

/**
 * Hook options for useLoading
 * Standardized configuration interface
 */
export interface UseLoadingOptions {
  timeout?: number;
  retryLimit?: number;
  retryDelay?: number;
  retryStrategy?: 'exponential' | 'linear' | 'none';
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
  priority?: 'high' | 'medium' | 'low';
  type?: 'page' | 'component' | 'api' | 'asset' | 'progressive' | 'form' | 'navigation' | 'data' | 'network' | 'inline' | 'network-aware' | 'timeout-aware';
  message?: string;
  metadata?: Readonly<Record<string, unknown>>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  onStateChange?: (state: 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'cancelled') => void;
}

/**
 * Hook options for useProgressiveLoading
 * Stage-based configuration
 */
export interface UseProgressiveLoadingOptions {
  stages: Array<{
    id: string;
    message: string;
    duration?: number;
    retryable?: boolean;
  }>;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  onStageComplete?: (stageIndex: number) => void;
  onAllStagesComplete?: () => void;
  onStageFailed?: (stageIndex: number, error: Error) => void;
}

/**
 * Hook options for useTimeoutAwareLoading
 * Timeout-specific configuration
 */
export interface UseTimeoutAwareLoadingOptions {
  timeoutDuration: number;
  warningThreshold?: number;
  maxRetries?: number;
  retryDelay?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  onRetry?: (retryCount: number) => void;
}