/**
 * Loading Context Types - STANDARDIZED with DISCRIMINATED UNIONS
 *
 * Standardized context types using discriminated unions following the exemplary pattern
 * from LoadingAction in loading.ts. This provides better type safety and autocompletion.
 *
 * Key improvements:
 * - Discriminated unions for action types
 * - Consistent naming conventions
 * - Comprehensive documentation
 * - Type-safe action creators
 */

import type { LoadingOperation, LoadingState, ConnectionInfo, AdaptiveSettings, AssetLoadingProgress, LoadingMetrics } from '../loading';

// ============================================================================
// Loading Context Value (Standardized)
// ============================================================================

export interface LoadingContextValue {
  state: {
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
  };

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
  getOperationsByType: (type: string) => readonly LoadingOperation[];
  getOperationsByPriority: (priority: 'high' | 'medium' | 'low') => readonly LoadingOperation[];
  isOperationActive: (id: string) => boolean;
  getActiveOperationsCount: () => number;
  shouldShowGlobalLoader: () => boolean;
  getEstimatedTimeRemaining: (id: string) => number | null;
  getStats: () => LoadingMetrics;

  // Convenience methods
  startPageLoading: (pageId: string, message?: string, options?: Partial<{
    timeout?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryStrategy?: 'exponential' | 'linear' | 'none';
    connectionAware?: boolean;
    showTimeoutWarning?: boolean;
    timeoutWarningThreshold?: number;
    priority?: 'high' | 'medium' | 'low';
    type?: string;
    message?: string;
    metadata?: Readonly<Record<string, unknown>>;
  }>) => void;
  completePageLoading: (pageId: string, success?: boolean, error?: Error) => void;
  startComponentLoading: (componentId: string, message?: string, options?: Partial<{
    timeout?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryStrategy?: 'exponential' | 'linear' | 'none';
    connectionAware?: boolean;
    showTimeoutWarning?: boolean;
    timeoutWarningThreshold?: number;
    priority?: 'high' | 'medium' | 'low';
    type?: string;
    message?: string;
    metadata?: Readonly<Record<string, unknown>>;
  }>) => void;
  completeComponentLoading: (componentId: string, success?: boolean, error?: Error) => void;
  startApiLoading: (apiId: string, message?: string, options?: Partial<{
    timeout?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryStrategy?: 'exponential' | 'linear' | 'none';
    connectionAware?: boolean;
    showTimeoutWarning?: boolean;
    timeoutWarningThreshold?: number;
    priority?: 'high' | 'medium' | 'low';
    type?: string;
    message?: string;
    metadata?: Readonly<Record<string, unknown>>;
  }>) => void;
  completeApiLoading: (apiId: string, success?: boolean, error?: Error) => void;
  startAssetLoading: (assetId: string, message?: string, options?: Partial<{
    timeout?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryStrategy?: 'exponential' | 'linear' | 'none';
    connectionAware?: boolean;
    showTimeoutWarning?: boolean;
    timeoutWarningThreshold?: number;
    priority?: 'high' | 'medium' | 'low';
    type?: string;
    message?: string;
    metadata?: Readonly<Record<string, unknown>>;
  }>) => void;
  completeAssetLoading: (assetId: string, success?: boolean, error?: Error) => void;
}

// ============================================================================
// Loading Context Actions (DISCRIMINATED UNION)
// ============================================================================
// Following the exact pattern from LoadingAction in loading.ts

export type LoadingContextAction =
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
// Loading Context State (Standardized)
// ============================================================================

export interface LoadingContextState {
  operations: Readonly<Record<string, LoadingOperation>>;
  stats: LoadingMetrics;
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  assetLoadingProgress: AssetLoadingProgress;
  error?: string;
}

// ============================================================================
// Loading Context Provider Props
// ============================================================================

export interface LoadingContextProviderProps {
  children: React.ReactNode;
  initialState?: Partial<LoadingContextState>;
  onError?: (error: Error) => void;
  onStateChange?: (state: LoadingContextState) => void;
}

// ============================================================================
// Type Guards for Loading Context Actions
// ============================================================================

export function isStartOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'START_OPERATION' }> {
  return action.type === 'START_OPERATION';
}

export function isUpdateOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'UPDATE_OPERATION' }> {
  return action.type === 'UPDATE_OPERATION';
}

export function isCompleteOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'COMPLETE_OPERATION' }> {
  return action.type === 'COMPLETE_OPERATION';
}

export function isRetryOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'RETRY_OPERATION' }> {
  return action.type === 'RETRY_OPERATION';
}

export function isCancelOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'CANCEL_OPERATION' }> {
  return action.type === 'CANCEL_OPERATION';
}

export function isTimeoutOperationAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'TIMEOUT_OPERATION' }> {
  return action.type === 'TIMEOUT_OPERATION';
}

export function isUpdateConnectionAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'UPDATE_CONNECTION' }> {
  return action.type === 'UPDATE_CONNECTION';
}

export function isUpdateAdaptiveSettingsAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'UPDATE_ADAPTIVE_SETTINGS' }> {
  return action.type === 'UPDATE_ADAPTIVE_SETTINGS';
}

export function isUpdateAssetProgressAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'UPDATE_ASSET_PROGRESS' }> {
  return action.type === 'UPDATE_ASSET_PROGRESS';
}

export function isShowTimeoutWarningAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'SHOW_TIMEOUT_WARNING' }> {
  return action.type === 'SHOW_TIMEOUT_WARNING';
}

export function isUpdateStatsAction(action: LoadingContextAction): action is Extract<LoadingContextAction, { type: 'UPDATE_STATS' }> {
  return action.type === 'UPDATE_STATS';
}