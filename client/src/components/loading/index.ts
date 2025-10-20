/**
 * Loading component barrel exports
 * Following navigation component patterns for clean imports
 */

// Export types
export type {
  LoadingSize,
  LoadingType,
  LoadingState,
  LoadingPhase,
  ConnectionType,
  LoadingPriority,
  LoadingStateProps,
  LoadingProgress,
  LoadingStage,
  LoadingOperation,
  LoadingStats,
  LoadingConfig,
  UseLoadingResult,
} from './types';

// Export hooks
export {
  useLoading,
  useLoadingState,
  useMultiLoadingState,
  useProgressiveLoading,
  useMultiProgressiveLoading,
  useTimeoutAwareLoading,
  useMultiTimeoutAwareLoading,
} from './hooks';

// Export UI components (will be created in next task)
export * from './ui';

// Export utilities
export * from './utils';

// Export constants
export {
  DEFAULT_LOADING_SIZE,
  DEFAULT_LOADING_TYPE,
  DEFAULT_LOADING_PRIORITY,
  LOADING_SIZES,
  LOADING_TIMEOUTS,
  RETRY_DELAYS,
  MAX_RETRIES,
  DEFAULT_LOADING_CONFIG,
  LOADING_MESSAGES,
  LOADING_STAGES,
} from './constants';

// Export error types
export {
  LoadingError,
  LoadingTimeoutError,
  LoadingValidationError,
  LoadingConfigurationError,
  LoadingOperationFailedError,
  LoadingNetworkError,
  LoadingAssetError,
  LoadingStageError,
  LoadingErrorType,
  isLoadingError,
  isTimeoutError,
  isValidationError,
  isNetworkError,
  isAssetError,
  isStageError,
} from './errors';

// Export validation functions
export {
  validateLoadingProgress,
  validateLoadingStage,
  validateLoadingOperation,
  validateLoadingConfig,
  validateLoadingStats,
  safeValidateLoadingProgress,
  safeValidateLoadingOperation,
  safeValidateLoadingConfig,
} from './validation';

// Export recovery utilities
export {
  LoadingRecoveryManager,
  useLoadingRecovery,
  createRecoveryContext,
  canAttemptRecovery,
  shouldUseGracefulDegradation,
  getRecoveryMessage,
} from './recovery';











































