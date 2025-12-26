/**
 * Loading component barrel exports - SIMPLIFIED
 * Core loading functionality only
 */

// Export core types
export type {
  LoadingSize,
  LoadingType,
  LoadingState,
  LoadingProps,
  LoadingConfig,
  LoadingOperation,
  LoadingPriority,
  LoadingStats,
  LoadingProgress,
  LoadingPhase,
  ConnectionType,
  LoadingStage,
  LoadingStateProps,
  UseLoadingResult,
} from './types';

// Export core hooks only
export {
  useLoading,
  useLoadingState,
} from './hooks';

// Export core UI components
export {
  LoadingIndicator,
} from './ui';

export { default as LoadingSpinner } from './LoadingSpinner';

// Export essential skeleton components
export {
  Skeleton,
  CardSkeleton,
  ListSkeleton,
} from './ui';

// Export core utilities
export {
  validateLoadingProgress,
  validateLoadingConfig,
} from './validation';

// Export simplified error types
export {
  LoadingError,
  LoadingTimeoutError,
  isLoadingError,
  isTimeoutError,
} from './errors';

// Export core constants
export {
  DEFAULT_LOADING_SIZE,
  DEFAULT_LOADING_TYPE,
  LOADING_SIZES,
  LOADING_TIMEOUTS,
  MAX_RETRIES,
  DEFAULT_LOADING_CONFIG,
} from './constants';

// Export global loading components
export {
  GlobalLoadingIndicator,
  MinimalGlobalLoadingIndicator,
  type GlobalLoadingIndicatorProps,
  type MinimalLoadingIndicatorProps,
  type LoadingIndicatorPosition,
  type LoadingIndicatorConfig,
} from './GlobalLoadingIndicator';

export {
  GlobalLoadingProvider,
  useGlobalLoading,
} from './GlobalLoadingProvider';

export {
  useGlobalLoadingIndicator,
  type UseGlobalLoadingIndicatorReturn,
  type ShowLoadingOptions,
} from './hooks/useGlobalLoadingIndicator';












































