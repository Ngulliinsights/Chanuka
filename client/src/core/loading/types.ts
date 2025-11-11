/**
 * Unified Loading States Management System Types
 * Consolidated from multiple implementations following error management pattern
 * Platform-agnostic types for cross-cutting loading concerns
 */

export type LoadingType = 'page' | 'component' | 'api' | 'asset' | 'progressive' | 'form' | 'navigation';
export type LoadingPriority = 'high' | 'medium' | 'low';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'cancelled';
export type ConnectionType = 'fast' | 'slow' | 'offline' | 'unknown';
export type RetryStrategy = 'exponential' | 'linear' | 'none';

export interface LoadingOperation {
  id: string;
  type: LoadingType;
  message?: string;
  progress?: number;
  stage?: string;
  priority: LoadingPriority;
  timeout?: number;
  retryCount: number;
  maxRetries: number;
  startTime: number;
  error?: Error;
  connectionAware: boolean;
  estimatedTime?: number;
  timeoutWarningShown?: boolean;
  cancelled?: boolean;
  retryStrategy: RetryStrategy;
  retryDelay: number;
  metadata?: Record<string, any>;
}

export interface LoadingStateData {
  operations: Record<string, LoadingOperation>;
  globalLoading: boolean;
  highPriorityLoading: boolean;
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  assetLoadingProgress: AssetLoadingProgress;
  stats: LoadingStats;
}

export interface ConnectionInfo {
  type: ConnectionType;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface AdaptiveSettings {
  enableAnimations: boolean;
  maxConcurrentOperations: number;
  defaultTimeout: number;
  retryDelay: number;
  timeoutWarningThreshold: number;
  connectionMultiplier: number;
}

export interface AssetLoadingProgress {
  loaded: number;
  total: number;
  phase: string;
  currentAsset?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
}

export interface LoadingStats {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageLoadTime: number;
  retryRate: number;
  connectionImpact: 'high' | 'medium' | 'low';
  lastUpdate: number;
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
  metadata?: Record<string, any>;
}

export interface ProgressiveStage {
  id: string;
  message: string;
  duration?: number;
  progress?: number;
  retryable?: boolean;
}

export interface LoadingScenario {
  id: string;
  name: string;
  description: string;
  defaultTimeout: number;
  retryStrategy: RetryStrategy;
  maxRetries: number;
  priority: LoadingPriority;
  connectionAware: boolean;
  progressTracking: boolean;
  stages?: ProgressiveStage[];
}

// Action types for reducer
export type LoadingAction =
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: { id: string; success: boolean; error?: Error } }
  | { type: 'RETRY_OPERATION'; payload: { id: string } }
  | { type: 'CANCEL_OPERATION'; payload: { id: string } }
  | { type: 'TIMEOUT_OPERATION'; payload: { id: string } }
  | { type: 'UPDATE_CONNECTION'; payload: { connectionInfo: ConnectionInfo; isOnline: boolean } }
  | { type: 'UPDATE_ADAPTIVE_SETTINGS'; payload: Partial<AdaptiveSettings> }
  | { type: 'UPDATE_ASSET_PROGRESS'; payload: AssetLoadingProgress }
  | { type: 'SHOW_TIMEOUT_WARNING'; payload: { id: string } }
  | { type: 'UPDATE_STATS'; payload: Partial<LoadingStats> };

// Hook result interfaces
export interface LoadingResult<T = any> {
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
  completedStages: string[];
  failedStages: string[];
  skippedStages: string[];
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

// Context interface
export interface LoadingContextValue {
  state: LoadingStateData;
  startOperation: (operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled'>) => void;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  retryOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  timeoutOperation: (id: string) => void;
  getOperation: (id: string) => LoadingOperation | undefined;
  getOperationsByType: (type: LoadingType) => LoadingOperation[];
  getOperationsByPriority: (priority: LoadingPriority) => LoadingOperation[];
  isOperationActive: (id: string) => boolean;
  getActiveOperationsCount: () => number;
  shouldShowGlobalLoader: () => boolean;
  getEstimatedTimeRemaining: (id: string) => number | null;
  getStats: () => LoadingStats;

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

// Error types
export class LoadingError extends Error {
  constructor(
    public operationId: string,
    message: string,
    public code?: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'LoadingError';
  }
}

export class LoadingTimeoutError extends LoadingError {
  constructor(
    operationId: string,
    public timeout: number,
    metadata?: Record<string, any>
  ) {
    super(operationId, `Operation timed out after ${timeout}ms`, 'TIMEOUT', metadata);
    this.name = 'LoadingTimeoutError';
  }
}

export class LoadingRetryError extends LoadingError {
  constructor(
    operationId: string,
    public retryCount: number,
    public maxRetries: number,
    metadata?: Record<string, any>
  ) {
    super(operationId, `Maximum retry attempts (${maxRetries}) reached`, 'MAX_RETRIES', metadata);
    this.name = 'LoadingRetryError';
  }
}

export class LoadingConnectionError extends LoadingError {
  constructor(
    operationId: string,
    public connectionType: ConnectionType,
    metadata?: Record<string, any>
  ) {
    super(operationId, `Operation failed due to connection (${connectionType})`, 'CONNECTION', metadata);
    this.name = 'LoadingConnectionError';
  }
}

// Utility types
export type LoadingHookOptions = LoadingOptions & {
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (state: LoadingState) => void;
};

export type LoadingComponentProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  showMessage?: boolean;
  className?: string;
  'aria-label'?: string;
};
