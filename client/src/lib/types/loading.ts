/**
 * UNIFIED Loading Type System - OPTIMIZED
 *
 * Single source of truth for all loading-related types.
 *
 * Key improvements:
 * - Strict typing with branded types where needed
 * - Eliminated ambiguous optional fields
 * - Better discriminated unions for state management
 * - Immutable arrays for safety
 * - Consistent naming conventions
 * - Fixed naming conflicts between LoadingResult interfaces
 */

// ============================================================================
// Core Enums & Types
// ============================================================================

export type LoadingState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'timeout'
  | 'cancelled'
  | 'refreshing'
  | 'offline';

export type ConnectionType = 'none' | 'cellular' | 'wifi' | 'ethernet' | 'bluetooth' | 'other' | 'unknown' | 'slow' | 'fast' | 'offline';

export type LoadingType =
  | 'page'
  | 'component'
  | 'api'
  | 'asset'
  | 'progressive'
  | 'form'
  | 'navigation'
  | 'data'
  | 'network'
  | 'inline'
  | 'network-aware'
  | 'timeout-aware';

export type LoadingPriority = 'high' | 'medium' | 'low';
export type RetryStrategy = 'exponential' | 'linear' | 'none';
// ConnectionType defined above
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingPhase = 'initial' | 'loading' | 'complete' | 'error';

// ============================================================================
// Core Operation Interface
// ============================================================================

/**
 * Complete loading operation with strict typing
 * Note: startTime is ALWAYS number (Date.now()), never Date object
 */
export interface LoadingOperation {
  // Identity
  readonly id: string;
  readonly type: LoadingType;
  readonly priority: LoadingPriority;

  // Timing - startTime is ALWAYS number milliseconds
  readonly startTime: number;
  readonly endTime?: number;
  readonly timeout?: number;
  readonly estimatedTime?: number;

  // Retry configuration
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly retryStrategy: RetryStrategy;
  readonly retryDelay: number;

  // State
  readonly state: LoadingState;
  readonly message?: string;
  readonly error?: Error | string;
  readonly progress?: number;
  readonly stage?: string;

  // Advanced features
  readonly connectionAware: boolean;
  readonly dependencies?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;

  // UI state
  readonly timeoutWarningShown: boolean;
  readonly cancelled: boolean;
  readonly description?: string;
}

// ============================================================================
// Connection & Network Types
// ============================================================================

export interface ConnectionInfo {
  type: ConnectionType;
  online: boolean;
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastChecked?: number;
}

export interface AdaptiveSettings {
  enableAnimations: boolean;
  maxConcurrentOperations: number;
  defaultTimeout: number;
  retryDelay: number;
  timeoutWarningThreshold: number;
  connectionMultiplier: number;
}

// ============================================================================
// Asset Loading
// ============================================================================

export type AssetLoadingStatus = 'pending' | 'loading' | 'complete' | 'error';

export interface AssetLoadingProgress {
  loaded: number;
  total: number;
  phase: string;
  currentAsset?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
  status: AssetLoadingStatus;
  error?: string;
}

// ============================================================================
// Metrics & Statistics
// ============================================================================

export type ConnectionImpact = 'high' | 'medium' | 'low';

export interface LoadingMetrics {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageLoadTime: number;
  retryRate: number;
  successRate: number;
  connectionImpact: ConnectionImpact;
  lastUpdate: number;
  currentQueueLength: number;
  peakQueueLength: number;
}

// Backward compatibility alias
export type LoadingStats = LoadingMetrics;

// ============================================================================
// State Management
// ============================================================================

export interface LoadingStateData {
  // Core state
  isLoading: boolean;
  operations: Readonly<Record<string, LoadingOperation>>;
  stats: LoadingMetrics;
  error?: string;

  // Connection
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;

  // Global indicators
  globalLoading: boolean;
  highPriorityLoading: boolean;

  // Asset tracking
  assetLoadingProgress: AssetLoadingProgress;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type LoadingConfigPriority = 'low' | 'normal' | 'high' | 'critical';

export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
  enableCaching: boolean;
  cacheTimeout?: number;
  priority: LoadingConfigPriority;
  dependencies?: readonly string[];
}

export interface LoadingOptions {
  timeout?: number;
  retryLimit?: number;
  retryDelay?: number;
  retryStrategy?: RetryStrategy;
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
  priority?: LoadingPriority;
  type?: LoadingType;
  message?: string;
  metadata?: Readonly<Record<string, unknown>>;
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

// Renamed from LoadingResult to OperationResult to avoid conflict
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
// Progressive Loading
// ============================================================================

export interface ProgressiveStage {
  readonly id: string;
  readonly message: string;
  readonly duration?: number;
  readonly progress?: number;
  readonly retryable?: boolean;
}

export type LoadingScenarioType =
  | 'initial'
  | 'paginated'
  | 'infinite-scroll'
  | 'real-time'
  | 'batch';

export interface LoadingScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultTimeout: number;
  readonly retryStrategy: RetryStrategy;
  readonly maxRetries: number;
  readonly priority: LoadingPriority;
  readonly connectionAware: boolean;
  readonly progressTracking: boolean;
  readonly stages?: readonly ProgressiveStage[];
}

// ============================================================================
// Reducer Actions (Discriminated Union)
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

/**
 * Result type for useLoading hook
 * Generic type T represents the expected data type
 */
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

  // Core operations
  startOperation: (
    operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled' | 'state'>
  ) => void;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  retryOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  timeoutOperation: (id: string) => void;

  // Query operations
  getOperation: (id: string) => LoadingOperation | undefined;
  getOperationsByType: (type: LoadingType) => readonly LoadingOperation[];
  getOperationsByPriority: (priority: LoadingPriority) => readonly LoadingOperation[];
  isOperationActive: (id: string) => boolean;
  getActiveOperationsCount: () => number;
  shouldShowGlobalLoader: () => boolean;
  getEstimatedTimeRemaining: (id: string) => number | null;
  getStats: () => LoadingMetrics;

  // Convenience methods
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
  children?: React.ReactNode;
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

// ============================================================================
// Error Classes
// ============================================================================

export class LoadingError extends Error {
  constructor(
    public readonly operationId: string,
    message: string,
    public readonly code?: string,
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'LoadingError';
    Object.setPrototypeOf(this, LoadingError.prototype);
  }
}

export class LoadingTimeoutError extends LoadingError {
  constructor(
    operationId: string,
    public readonly timeout: number,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(operationId, `Operation timed out after ${timeout}ms`, 'TIMEOUT', metadata);
    this.name = 'LoadingTimeoutError';
    Object.setPrototypeOf(this, LoadingTimeoutError.prototype);
  }
}

export class LoadingRetryError extends LoadingError {
  constructor(
    operationId: string,
    public readonly retryCount: number,
    public readonly maxRetries: number,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(
      operationId,
      `Maximum retry attempts (${maxRetries}) reached`,
      'MAX_RETRIES',
      metadata
    );
    this.name = 'LoadingRetryError';
    Object.setPrototypeOf(this, LoadingRetryError.prototype);
  }
}

export class LoadingConnectionError extends LoadingError {
  constructor(
    operationId: string,
    public readonly connectionType: ConnectionType,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(
      operationId,
      `Operation failed due to connection (${connectionType})`,
      'CONNECTION',
      metadata
    );
    this.name = 'LoadingConnectionError';
    Object.setPrototypeOf(this, LoadingConnectionError.prototype);
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export interface LoadingHookOptions extends LoadingOptions {
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (state: LoadingState) => void;
}
