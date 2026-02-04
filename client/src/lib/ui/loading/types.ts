/**
 * Loading Types Re-export
 * 
 * This file re-exports types from the canonical types location for legacy imports.
 * The source of truth for loading types is @client/lib/types/loading.
 */

export type {
  LoadingState,
  LoadingType,
  LoadingPriority,
  LoadingPhase,
  LoadingSize,
  LoadingOperation,
  LoadingConfig,
  LoadingOptions,
  ConnectionInfo,
  ConnectionType,
  RetryStrategy,
  LoadingStateData,
  AssetLoadingProgress,
  LoadingMetrics,
  // Additional types for loading UI components
  LoadingProps,
  LoadingStats,
  LoadingProgress,
  LoadingStage,
  LoadingStateProps,
  UseLoadingResult,
  RecoveryState,
  LoadingRecoveryState,
  ProgressiveLoaderProps,
  SkeletonProps,
  TimeoutAwareLoaderProps,
  AssetLoadingIndicatorProps,
  ExtendedLoadingConfig,
  LoadingConfigValidation,
  LoadingConfigErrorHandling,
  ProgressiveStage,
  LoadingComponentProps,
} from '@client/lib/types/loading';

