/**
 * Loading System Types - Consolidated from multiple implementations
 * Platform-agnostic types for cross-cutting loading concerns
 */

export type LoadingType = 'page' | 'component' | 'api' | 'asset' | 'progressive';
export type LoadingPriority = 'high' | 'medium' | 'low';

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
}

export interface LoadingState {
  operations: Record<string, LoadingOperation>;
  globalLoading: boolean;
  highPriorityLoading: boolean;
  connectionInfo: any;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  assetLoadingProgress: AssetLoadingProgress;
}

export interface AdaptiveSettings {
  enableAnimations: boolean;
  maxConcurrentOperations: number;
  defaultTimeout: number;
  retryDelay: number;
  timeoutWarningThreshold: number;
}

export interface AssetLoadingProgress {
  loaded: number;
  total: number;
  phase: string;
  currentAsset?: string;
}

export interface LoadingOptions {
  timeout?: number;
  retryLimit?: number;
  retryDelay?: number;
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
  priority?: LoadingPriority;
}

export interface ProgressiveStage {
  id: string;
  message: string;
  duration?: number;
}

// Action types for reducer
export type LoadingAction =
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: { id: string; success: boolean; error?: Error } }
  | { type: 'RETRY_OPERATION'; payload: { id: string } }
  | { type: 'CANCEL_OPERATION'; payload: { id: string } }
  | { type: 'UPDATE_CONNECTION'; payload: { connectionInfo: any; isOnline: boolean } }
  | { type: 'UPDATE_ADAPTIVE_SETTINGS'; payload: Partial<AdaptiveSettings> }
  | { type: 'UPDATE_ASSET_PROGRESS'; payload: AssetLoadingProgress }
  | { type: 'SHOW_TIMEOUT_WARNING'; payload: { id: string } };

// Hook result interfaces
export interface LoadingResult<T = any> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isTimeout: boolean;
  retryCount: number;
  timeElapsed: number;
  estimatedTimeRemaining: number | null;
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
}