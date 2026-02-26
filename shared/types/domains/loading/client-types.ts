/**
 * Client-Specific Loading Types
 * React components, hooks, and UI-specific types
 * These are defined here but only used by the client
 */

import type {
  LoadingState,
  LoadingType,
  LoadingPriority,
  LoadingOperation,
  ConnectionInfo,
  AdaptiveSettings,
  AssetLoadingProgress,
  LoadingMetrics,
  LoadingOptions,
  LoadingSize,
  ProgressiveStage,
  RetryStrategy,
  ConnectionType,
  LoadingError,
  LoadingConfig
  // LoadingConfigPriority // Unused
} from './types';

// ============================================================================
// Extended Configuration with React-specific features
// ============================================================================

export interface LoadingConfigValidation {
  enabled?: boolean;
  strict?: boolean;
  maxDuration?: number;
  minProgress?: number;
  requireProgress?: boolean;
}

export interface LoadingConfigErrorHandling {
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackComponent?: any; // React.ComponentType
  onError?: (error: Error) => void;
}

export interface ExtendedLoadingConfig extends LoadingConfig {
  validation?: LoadingConfigValidation;
  errorHandling?: LoadingConfigErrorHandling;
}

// ============================================================================
// State Management
// ============================================================================

export interface LoadingStateData {
  isLoading: boolean;
  operations: Readonly<Record<string, LoadingOperation>>;
  stats: LoadingMetrics;
  error?: string;
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  globalLoading: boolean;
  highPriorityLoading: boolean;
  assetLoadingProgress: AssetLoadingProgress;
}

// ============================================================================
// Queue & Batch Management
// ============================================================================

export type QueuePriority = 'low' | 'normal' | 'high';

export interface LoadingQueue {
  readonly id: string;
  operations: readonly LoadingOperation[];
  readonly concurrentLimit: number;
  readonly priority: QueuePriority;
  paused: boolean;
  readonly createdAt: number;
}

export type ConditionType = 'network' | 'device' | 'user' | 'time' | 'custom';
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'matches';

export interface LoadingCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: unknown;
  field?: string;
}

export type ActionType = 'retry' | 'fallback' | 'cancel' | 'prioritize' | 'delay' | 'cache';

export interface LoadingActionType {
  type: ActionType;
  parameters?: Readonly<Record<string, unknown>>;
}

export interface LoadingStrategy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  conditions: readonly LoadingCondition[];
  actions: readonly LoadingActionType[];
  readonly priority: number;
  enabled: boolean;
}

export interface OperationResult {
  readonly operationId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly duration: number;
  readonly retries: number;
}

export interface LoadingBatch {
  readonly id: string;
  operations: readonly LoadingOperation[];
  readonly strategy: LoadingStrategy;
  status: LoadingState;
  results: readonly OperationResult[];
  readonly startedAt: number;
  readonly completedAt?: number;
}

// ============================================================================
// Reducer Actions
// ============================================================================

export type LoadingAction =
  | {
      type: 'START_OPERATION';
      payload: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled' | 'state'>;
    }
  | {
      type: 'UPDATE_OPERATION';
      payload: { id: string; updates: Partial<LoadingOperation> };
    }
  | {
      type: 'COMPLETE_OPERATION';
      payload: { id: string; success: boolean; error?: Error };
    }
  | {
      type: 'RETRY_OPERATION';
      payload: { id: string };
    }
  | {
      type: 'CANCEL_OPERATION';
      payload: { id: string };
    }
  | {
      type: 'TIMEOUT_OPERATION';
      payload: { id: string };
    }
  | {
      type: 'UPDATE_CONNECTION';
      payload: { connectionInfo: ConnectionInfo; isOnline: boolean };
    }
  | {
      type: 'UPDATE_ADAPTIVE_SETTINGS';
      payload: Partial<AdaptiveSettings>;
    }
  | {
      type: 'UPDATE_ASSET_PROGRESS';
      payload: AssetLoadingProgress;
    }
  | {
      type: 'SHOW_TIMEOUT_WARNING';
      payload: { id: string };
    }
  | {
      type: 'UPDATE_STATS';
      payload: Partial<LoadingMetrics>;
    };

// ============================================================================
// Hook Result Types
// ============================================================================

export interface LoadingResult<T = unknown> {
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

export interface ProgressiveLoadingResult {
  currentStage: ProgressiveStage | null;
  currentStageIndex: number;
  progress: number;
  stageProgress: number;
  state: LoadingState;
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

export interface TimeoutAwareLoadingResult {
  state: LoadingState;
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

// ============================================================================
// Context Interface
// ============================================================================

export interface LoadingContextValue {
  state: LoadingStateData;
  startOperation: (
    operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled' | 'state'>
  ) => void;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  retryOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  timeoutOperation: (id: string) => void;
  getOperation: (id: string) => LoadingOperation | undefined;
  getOperationsByType: (type: LoadingType) => readonly LoadingOperation[];
  getOperationsByPriority: (priority: LoadingPriority) => readonly LoadingOperation[];
  isOperationActive: (id: string) => boolean;
  getActiveOperationsCount: () => number;
  shouldShowGlobalLoader: () => boolean;
  getEstimatedTimeRemaining: (id: string) => number | null;
  getStats: () => LoadingMetrics;
  startPageLoading: (pageId: string, message?: string, options?: Partial<LoadingOptions>) => void;
  completePageLoading: (pageId: string, success?: boolean, error?: Error) => void;
  startComponentLoading: (componentId: string, message?: string, options?: Partial<LoadingOptions>) => void;
  completeComponentLoading: (componentId: string, success?: boolean, error?: Error) => void;
  startApiLoading: (apiId: string, message?: string, options?: Partial<LoadingOptions>) => void;
  completeApiLoading: (apiId: string, success?: boolean, error?: Error) => void;
  startAssetLoading: (assetId: string, message?: string, options?: Partial<LoadingOptions>) => void;
  completeAssetLoading: (assetId: string, success?: boolean, error?: Error) => void;
}

// ============================================================================
// Component Props
// ============================================================================

export interface LoadingComponentProps {
  isLoading: boolean;
  error?: string;
  progress?: number;
  message?: string;
  size?: LoadingSize;
  showMessage?: boolean;
  className?: string;
  'aria-label'?: string;
}

export interface LoadingProps {
  size?: LoadingSize;
  message?: string;
  showMessage?: boolean;
  className?: string;
  children?: any; // React.ReactNode
  testId?: string;
}

export type AssetIndicatorPosition = 'fixed' | 'relative' | 'absolute';

export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: AssetIndicatorPosition;
}

export interface LoadingStateProps {
  className?: string;
  size?: LoadingSize;
  message?: string;
  showMessage?: boolean;
  color?: 'primary' | 'secondary' | 'accent' | 'muted';
}

export interface UseLoadingResult<T = unknown> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export interface RecoveryState {
  isRecovering: boolean;
  canRecover: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  lastError?: Error | string;
  suggestions: readonly string[];
}

export interface LoadingRecoveryState extends RecoveryState {
  lastAttemptTime?: number;
  recoveryStrategy?: RetryStrategy;
}

export interface ProgressiveLoaderProps {
  stages: readonly ProgressiveStage[];
  currentStage: number;
  className?: string;
  showLabels?: boolean;
  onStageComplete?: (stageIndex: number) => void;
  onRetryStage?: (stageIndex: number) => void;
  onError?: (error: Error, stageIndex: number) => void;
  onSkipStage?: (stageIndex: number) => void;
  showRetryButton?: boolean;
  allowSkip?: boolean;
}

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export interface TimeoutAwareLoaderProps {
  className?: string;
  timeout?: number;
  warningThreshold?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  message?: string;
  showElapsedTime?: boolean;
  size?: LoadingSize;
  showMessage?: boolean;
  showTimeoutWarning?: boolean;
  timeoutMessage?: string;
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

export type LoadingProgress = AssetLoadingProgress;
export type LoadingStage = ProgressiveStage;

export interface LoadingStats {
  loaded: number;
  failed: number;
  connectionType: ConnectionType;
  isOnline: boolean;
}

export interface LoadingHookOptions extends LoadingOptions {
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (state: LoadingState) => void;
}
