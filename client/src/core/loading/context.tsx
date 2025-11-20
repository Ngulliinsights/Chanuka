/**
 * Unified Loading Context - Consolidated from multiple implementations
 * Best practices: Connection awareness, asset loading integration, timeout management
 * Integrated with error management system
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import { LoadingStateData, LoadingAction, LoadingOperation, LoadingOptions, LoadingPriority, LoadingType, LoadingContextValue, ConnectionInfo, AdaptiveSettings, AssetLoadingProgress, LoadingStats, LoadingError, LoadingTimeoutError, LoadingRetryError, LoadingConnectionError } from './types';
import { loadingReducer } from './reducer';
import { logger } from '@client/utils/logger';
import { useErrorAnalytics } from '@client/features/analytics/hooks/useErrorAnalytics';

const initialState: LoadingStateData = {
  operations: {},
  globalLoading: false,
  highPriorityLoading: false,
  connectionInfo: {
    type: 'unknown',
  },
  isOnline: navigator.onLine,
  adaptiveSettings: {
    enableAnimations: true,
    maxConcurrentOperations: 4,
    defaultTimeout: 30000,
    retryDelay: 1000,
    timeoutWarningThreshold: 0.7,
    connectionMultiplier: 1,
  },
  assetLoadingProgress: {
    loaded: 0,
    total: 0,
    phase: 'preload',
  },
  stats: {
    totalOperations: 0,
    activeOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    averageLoadTime: 0,
    retryRate: 0,
    connectionImpact: 'low',
    lastUpdate: Date.now(),
  },
};

export interface LoadingProviderProps {
  children: React.ReactNode;
  useConnectionAware?: () => ConnectionInfo;
  useOnlineStatus?: () => boolean;
  assetLoadingManager?: any;
  errorAnalytics?: ReturnType<typeof useErrorAnalytics>;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({
  children,
  useConnectionAware,
  useOnlineStatus,
  assetLoadingManager,
  errorAnalytics
}: LoadingProviderProps) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);
  const errorAnalyticsRef = useRef(errorAnalytics);

  // Update error analytics reference
  useEffect(() => {
    errorAnalyticsRef.current = errorAnalytics;
  }, [errorAnalytics]);

  // Connection awareness
  const connectionInfo = useConnectionAware?.() || state.connectionInfo;
  const isOnline = useOnlineStatus?.() ?? navigator.onLine;

  // Asset loading progress subscription
  useEffect(() => {
    if (assetLoadingManager?.onProgress) {
      const unsubscribe = assetLoadingManager.onProgress((progress: AssetLoadingProgress) => {
        dispatch({ type: 'UPDATE_ASSET_PROGRESS', payload: progress });
      });
      return unsubscribe;
    }
  }, [assetLoadingManager]);

  // Update connection info when it changes
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { connectionInfo, isOnline },
    });
  }, [connectionInfo, isOnline]);

  // Monitor operations for timeouts and warnings
  useEffect(() => {
    const interval = setInterval(() => {
      // Narrow the entries to the expected LoadingOperation shape so TypeScript knows
      // what fields exist on each operation.
      (Object.entries(state.operations) as [string, LoadingOperation][]).forEach(([id, operation]) => {
        const elapsed = Date.now() - operation.startTime;
        const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
        const warningThreshold = timeout * state.adaptiveSettings.timeoutWarningThreshold;

        // Show timeout warning
        if (elapsed > warningThreshold && !operation.timeoutWarningShown) {
          dispatch({ type: 'SHOW_TIMEOUT_WARNING', payload: { id } });
        }

        // Timeout operation
        if (elapsed > timeout && !operation.error) {
          const timeoutError = new LoadingTimeoutError(id, timeout, {
            elapsed,
            retryCount: operation.retryCount,
            maxRetries: operation.maxRetries,
          });

          dispatch({
            type: 'TIMEOUT_OPERATION',
            payload: { id },
          });

          // Report to error analytics (use `any` to avoid mismatched analytics type shape)
          (errorAnalyticsRef.current as any)?.trackError(timeoutError, {
            component: 'LoadingProvider',
            operation: operation,
            context: 'timeout',
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.operations, state.adaptiveSettings]);

  const startOperation = useCallback((operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled'>) => {
    // Prevent duplicate operations
    if (state.operations[operation.id]) {
      logger.warn(`Operation ${operation.id} is already running`);
      return;
    }

    // Check concurrent operation limits
    const activeOperations = Object.values(state.operations);
    const totalCount = activeOperations.length;

    if (totalCount >= state.adaptiveSettings.maxConcurrentOperations) {
      if (operation.priority !== 'high') {
        logger.warn(`Delaying operation ${operation.id} due to concurrent operation limit`);
        return;
      }
    }

    // Skip low priority operations on slow connections or when offline
    if (!isOnline || (connectionInfo.type === 'slow' && operation.priority === 'low')) {
      const connectionError = new LoadingConnectionError(operation.id, connectionInfo.type, {
        isOnline,
        connectionInfo,
      });

      // Logger and analytics may expect different shapes; cast to `any` for safety.
      logger.warn(`Skipping operation ${operation.id} due to connection constraints`, connectionError as any);

      // Report to error analytics
      (errorAnalyticsRef.current as any)?.trackError(connectionError, {
        component: 'LoadingProvider',
        operation: operation,
        context: 'connection-constraint',
      });

      return;
    }

    dispatch({ type: 'START_OPERATION', payload: operation });
  }, [state.operations, state.adaptiveSettings.maxConcurrentOperations, isOnline, connectionInfo]);

  const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    dispatch({ type: 'UPDATE_OPERATION', payload: { id, updates } });
  }, []);

  const completeOperation = useCallback((id: string, success: boolean, error?: Error) => {
    dispatch({ type: 'COMPLETE_OPERATION', payload: { id, success, error } });

    // Report errors to analytics
    if (!success && error) {
      const loadingError = error instanceof LoadingError ? error :
        new LoadingError(id, error.message, 'OPERATION_FAILED', { originalError: error });

      // Analytics object shape can vary; cast to `any` for tracking calls
      (errorAnalyticsRef.current as any)?.trackError(loadingError, {
        component: 'LoadingProvider',
        operation: state.operations[id] as any,
        context: 'operation-failure',
      });
    }
  }, [state.operations]);

  const retryOperation = useCallback((id: string) => {
    const operation = state.operations[id];
    if (!operation) return;

    if (operation.retryCount >= operation.maxRetries) {
      const retryError = new LoadingRetryError(id, operation.retryCount, operation.maxRetries, {
        operation,
      });

      completeOperation(id, false, retryError);
      return;
    }

    // Calculate retry delay based on strategy
    let delay = operation.retryDelay;
    switch (operation.retryStrategy) {
      case 'exponential':
        delay = operation.retryDelay * Math.pow(2, operation.retryCount);
        break;
      case 'linear':
        delay = operation.retryDelay * (operation.retryCount + 1);
        break;
      case 'none':
        delay = 0;
        break;
    }

    // Apply connection-aware delay multiplier
    delay *= state.adaptiveSettings.connectionMultiplier;

    setTimeout(() => {
      dispatch({ type: 'RETRY_OPERATION', payload: { id } });
    }, delay);
  }, [state.operations, state.adaptiveSettings.connectionMultiplier, completeOperation]);

  const cancelOperation = useCallback((id: string) => {
    dispatch({ type: 'CANCEL_OPERATION', payload: { id } });
  }, []);

  const timeoutOperation = useCallback((id: string) => {
    const operation = state.operations[id];
    if (!operation) return;

    const timeoutError = new LoadingTimeoutError(id, operation.timeout || state.adaptiveSettings.defaultTimeout, {
      operation,
    });

    completeOperation(id, false, timeoutError);
  }, [state.operations, state.adaptiveSettings.defaultTimeout, completeOperation]);

  const getOperation = useCallback((id: string) => {
    return state.operations[id];
  }, [state.operations]);

  const getOperationsByType = useCallback((type: LoadingType) => {
    const ops = Object.values(state.operations) as LoadingOperation[];
    return ops.filter(op => op.type === type);
  }, [state.operations]);

  const getOperationsByPriority = useCallback((priority: LoadingPriority) => {
    const ops = Object.values(state.operations) as LoadingOperation[];
    return ops.filter(op => op.priority === priority);
  }, [state.operations]);

  const isOperationActive = useCallback((id: string) => {
    return id in state.operations;
  }, [state.operations]);

  const getActiveOperationsCount = useCallback(() => {
    return Object.keys(state.operations).length;
  }, [state.operations]);

  const shouldShowGlobalLoader = useCallback(() => {
    return state.highPriorityLoading || (state.globalLoading && getActiveOperationsCount() > 2);
  }, [state.highPriorityLoading, state.globalLoading, getActiveOperationsCount]);

  const getEstimatedTimeRemaining = useCallback((id: string): number | null => {
    const operation = state.operations[id];
    if (!operation) return null;

    const elapsed = Date.now() - operation.startTime;
    const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
    const remaining = timeout - elapsed;

    return remaining > 0 ? remaining : null;
  }, [state.operations, state.adaptiveSettings.defaultTimeout]);

  const getStats = useCallback(() => {
    return state.stats;
  }, [state.stats]);

  // Convenience methods
  const startPageLoading = useCallback((pageId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
    startOperation({
      id: `page-${pageId}`,
      type: 'page',
      message: message || 'Loading page...',
      priority: options.priority || 'high',
      timeout: options.timeout,
      maxRetries: options.retryLimit || 2,
      connectionAware: options.connectionAware ?? true,
      retryStrategy: options.retryStrategy || 'exponential',
      retryDelay: options.retryDelay || 1000,
      metadata: options.metadata,
    });
  }, [startOperation]);

  const completePageLoading = useCallback((pageId: string, success: boolean = true, error?: Error) => {
    completeOperation(`page-${pageId}`, success, error);
  }, [completeOperation]);

  const startComponentLoading = useCallback((componentId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
    startOperation({
      id: `component-${componentId}`,
      type: 'component',
      message: message || 'Loading component...',
      priority: options.priority || 'medium',
      timeout: options.timeout,
      maxRetries: options.retryLimit || 1,
      connectionAware: options.connectionAware ?? true,
      retryStrategy: options.retryStrategy || 'linear',
      retryDelay: options.retryDelay || 1000,
      metadata: options.metadata,
    });
  }, [startOperation]);

  const completeComponentLoading = useCallback((componentId: string, success: boolean = true, error?: Error) => {
    completeOperation(`component-${componentId}`, success, error);
  }, [completeOperation]);

  const startApiLoading = useCallback((apiId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
    startOperation({
      id: `api-${apiId}`,
      type: 'api',
      message: message || 'Loading data...',
      priority: options.priority || 'medium',
      timeout: options.timeout || 12000,
      maxRetries: options.retryLimit || 3,
      connectionAware: options.connectionAware ?? true,
      retryStrategy: options.retryStrategy || 'exponential',
      retryDelay: options.retryDelay || 1000,
      metadata: options.metadata,
    });
  }, [startOperation]);

  const completeApiLoading = useCallback((apiId: string, success: boolean = true, error?: Error) => {
    completeOperation(`api-${apiId}`, success, error);
  }, [completeOperation]);

  const startAssetLoading = useCallback((assetId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
    startOperation({
      id: `asset-${assetId}`,
      type: 'asset',
      message: message || 'Loading assets...',
      priority: options.priority || 'low',
      timeout: options.timeout || 20000,
      maxRetries: options.retryLimit || 1,
      connectionAware: options.connectionAware ?? true,
      retryStrategy: options.retryStrategy || 'linear',
      retryDelay: options.retryDelay || 2000,
      metadata: options.metadata,
    });
  }, [startOperation]);

  const completeAssetLoading = useCallback((assetId: string, success: boolean = true, error?: Error) => {
    completeOperation(`asset-${assetId}`, success, error);
  }, [completeOperation]);

  const value: LoadingContextValue = useMemo(() => ({
    state,
    startOperation,
    updateOperation,
    completeOperation,
    retryOperation,
    cancelOperation,
    timeoutOperation,
    getOperation,
    getOperationsByType,
    getOperationsByPriority,
    isOperationActive,
    getActiveOperationsCount,
    shouldShowGlobalLoader,
    getEstimatedTimeRemaining,
    getStats,
    startPageLoading,
    completePageLoading,
    startComponentLoading,
    completeComponentLoading,
    startApiLoading,
    completeApiLoading,
    startAssetLoading,
    completeAssetLoading,
  }), [
    state,
    startOperation,
    updateOperation,
    completeOperation,
    retryOperation,
    cancelOperation,
    timeoutOperation,
    getOperation,
    getOperationsByType,
    getOperationsByPriority,
    isOperationActive,
    getActiveOperationsCount,
    shouldShowGlobalLoader,
    getEstimatedTimeRemaining,
    getStats,
    startPageLoading,
    completePageLoading,
    startComponentLoading,
    completeComponentLoading,
    startApiLoading,
    completeApiLoading,
    startAssetLoading,
    completeAssetLoading,
  ]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Export LoadingProvider for compatibility
export const UnifiedLoadingProvider = LoadingProvider;