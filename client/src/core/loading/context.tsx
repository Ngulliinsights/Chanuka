/**
 * Unified Loading Context - Optimized Type-safe Implementation
 * Features: Connection awareness, asset loading, timeout management, error analytics
 * Optimizations: Memoization, event batching, performance monitoring
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import {
  LoadingStateData,
  LoadingAction,
  LoadingOperation,
  LoadingOptions,
  LoadingPriority,
  LoadingType,
  LoadingContextValue,
  ConnectionInfo,
  AssetLoadingProgress,
  LoadingStats,
  LoadingError,
  LoadingTimeoutError,
  LoadingRetryError,
  LoadingConnectionError,
} from '@client/shared/types/loading';
import { logger } from '@client/shared/utils/logger';

import { loadingReducer } from './reducer';

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_CONCURRENT = 4;
const DEFAULT_RETRY_DELAY = 1000;
const TIMEOUT_WARNING_THRESHOLD = 0.7;
const MONITOR_INTERVAL = 1000;

const initialState: LoadingStateData = {
  isLoading: false,
  operations: {},
  globalLoading: false,
  highPriorityLoading: false,
  connectionInfo: {
    type: 'unknown',
  },
  isOnline: navigator.onLine,
  adaptiveSettings: {
    enableAnimations: true,
    maxConcurrentOperations: DEFAULT_MAX_CONCURRENT,
    defaultTimeout: DEFAULT_TIMEOUT,
    retryDelay: DEFAULT_RETRY_DELAY,
    timeoutWarningThreshold: TIMEOUT_WARNING_THRESHOLD,
    connectionMultiplier: 1,
  },
  assetLoadingProgress: {
    loaded: 0,
    total: 0,
    phase: 'initial',
    status: 'pending',
  },
  stats: {
    totalOperations: 0,
    activeOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    averageLoadTime: 0,
    retryRate: 0,
    successRate: 0,
    currentQueueLength: 0,
    peakQueueLength: 0,
    connectionImpact: 'low',
    lastUpdate: Date.now(),
  },
};

export interface LoadingProviderProps {
  children: React.ReactNode;
  useConnectionAware?: () => ConnectionInfo;
  useOnlineStatus?: () => boolean;
  assetLoadingManager?: {
    onProgress?: (callback: (progress: AssetLoadingProgress) => void) => () => void;
  };
  errorAnalytics?: {
    trackError: (error: Error, context?: Record<string, unknown>) => void;
  };
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({
  children,
  useConnectionAware,
  useOnlineStatus,
  assetLoadingManager,
  errorAnalytics,
}: LoadingProviderProps) {
  const [state, dispatch] = useReducer<React.Reducer<LoadingStateData, LoadingAction>>(
    loadingReducer,
    initialState
  );

  // Stable refs for callbacks and dependencies
  const errorAnalyticsRef = useRef(errorAnalytics);
  const pendingTimeoutsRef = useRef<Set<string>>(new Set());
  const monitorIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    errorAnalyticsRef.current = errorAnalytics;
  }, [errorAnalytics]);

  // Connection state management
  const connectionInfo = useConnectionAware?.() || state.connectionInfo;
  const isOnline = useOnlineStatus?.() ?? navigator.onLine;

  // Asset loading progress subscription
  useEffect(() => {
    if (!assetLoadingManager?.onProgress) return;

    const unsubscribe = assetLoadingManager.onProgress((progress: AssetLoadingProgress) => {
      dispatch({ type: 'UPDATE_ASSET_PROGRESS', payload: progress });
    });

    return unsubscribe;
  }, [assetLoadingManager]);

  // Update connection info
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { connectionInfo, isOnline },
    });
  }, [connectionInfo, isOnline]);

  // Optimized timeout monitoring with batching
  useEffect(() => {
    const monitorOperations = () => {
      const now = Date.now();
      const operationsToTimeout: string[] = [];
      const operationsToWarn: string[] = [];

      Object.entries(state.operations).forEach(([id, operation]) => {
        const elapsed = now - operation.startTime;
        const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
        const warningThreshold = timeout * state.adaptiveSettings.timeoutWarningThreshold;

        // Check for timeout warning
        if (elapsed > warningThreshold && !operation.timeoutWarningShown) {
          operationsToWarn.push(id);
        }

        // Check for timeout
        if (elapsed > timeout && !operation.error && !pendingTimeoutsRef.current.has(id)) {
          operationsToTimeout.push(id);
          pendingTimeoutsRef.current.add(id);
        }
      });

      // Batch dispatch warnings
      operationsToWarn.forEach((id) => {
        dispatch({ type: 'SHOW_TIMEOUT_WARNING', payload: { id } });
      });

      // Batch dispatch timeouts
      operationsToTimeout.forEach((id) => {
        const operation = state.operations[id];
        if (!operation) return;

        const timeoutError = new LoadingTimeoutError(id, operation.timeout || state.adaptiveSettings.defaultTimeout, {
          elapsed: now - operation.startTime,
          retryCount: operation.retryCount,
          maxRetries: operation.maxRetries,
        });

        dispatch({ type: 'TIMEOUT_OPERATION', payload: { id } });

        errorAnalyticsRef.current?.trackError(timeoutError, {
          component: 'LoadingProvider',
          operation,
          context: 'timeout',
        });
      });
    };

    monitorIntervalRef.current = setInterval(monitorOperations, MONITOR_INTERVAL);

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
      pendingTimeoutsRef.current.clear();
    };
  }, [state.operations, state.adaptiveSettings]);

  // Core operation management
  const startOperation = useCallback(
    (
      operation: Omit<
        LoadingOperation,
        'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled' | 'state'
      >
    ) => {
      // Check if operation already exists
      if (state.operations[operation.id]) {
        logger.warn(`Operation ${operation.id} is already running`);
        return;
      }

      // Check concurrent operation limits
      const activeCount = Object.keys(state.operations).length;
      if (
        activeCount >= state.adaptiveSettings.maxConcurrentOperations &&
        operation.priority !== 'high'
      ) {
        logger.warn(`Delaying operation ${operation.id} due to concurrent limit`);
        return;
      }

      // Connection-aware operation gating
      if (!isOnline || (connectionInfo.type === 'slow' && operation.priority === 'low')) {
        const connectionError = new LoadingConnectionError(operation.id, connectionInfo.type, {
          isOnline,
          connectionInfo,
        });

        logger.warn(`Skipping operation ${operation.id} due to connection constraints`);
        errorAnalyticsRef.current?.trackError(connectionError, {
          component: 'LoadingProvider',
          operation,
          context: 'connection-constraint',
        });
        return;
      }

      dispatch({ type: 'START_OPERATION', payload: operation });
    },
    [state.operations, state.adaptiveSettings.maxConcurrentOperations, isOnline, connectionInfo]
  );

  const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    dispatch({ type: 'UPDATE_OPERATION', payload: { id, updates } });
  }, []);

  const completeOperation = useCallback(
    (id: string, success: boolean, error?: Error) => {
      pendingTimeoutsRef.current.delete(id);
      dispatch({ type: 'COMPLETE_OPERATION', payload: { id, success, error } });

      if (!success && error) {
        const loadingError =
          error instanceof LoadingError
            ? error
            : new LoadingError(id, error.message, 'OPERATION_FAILED', { originalError: error });

        errorAnalyticsRef.current?.trackError(loadingError, {
          component: 'LoadingProvider',
          operation: state.operations[id],
          context: 'operation-failure',
        });
      }
    },
    [state.operations]
  );

  const retryOperation = useCallback(
    (id: string) => {
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

      // Apply connection multiplier
      delay *= state.adaptiveSettings.connectionMultiplier;

      setTimeout(() => {
        dispatch({ type: 'RETRY_OPERATION', payload: { id } });
      }, delay);
    },
    [state.operations, state.adaptiveSettings.connectionMultiplier, completeOperation]
  );

  const cancelOperation = useCallback((id: string) => {
    pendingTimeoutsRef.current.delete(id);
    dispatch({ type: 'CANCEL_OPERATION', payload: { id } });
  }, []);

  const timeoutOperation = useCallback(
    (id: string) => {
      const operation = state.operations[id];
      if (!operation) return;

      const timeoutError = new LoadingTimeoutError(
        id,
        operation.timeout || state.adaptiveSettings.defaultTimeout,
        { operation }
      );
      completeOperation(id, false, timeoutError);
    },
    [state.operations, state.adaptiveSettings.defaultTimeout, completeOperation]
  );

  // Query operations
  const getOperation = useCallback(
    (id: string): LoadingOperation | undefined => state.operations[id],
    [state.operations]
  );

  const getOperationsByType = useCallback(
    (type: LoadingType): readonly LoadingOperation[] => {
      return Object.values(state.operations).filter((op): op is LoadingOperation => op.type === type);
    },
    [state.operations]
  );

  const getOperationsByPriority = useCallback(
    (priority: LoadingPriority): readonly LoadingOperation[] => {
      return Object.values(state.operations).filter(
        (op): op is LoadingOperation => op.priority === priority
      );
    },
    [state.operations]
  );

  const isOperationActive = useCallback(
    (id: string): boolean => id in state.operations,
    [state.operations]
  );

  const getActiveOperationsCount = useCallback(
    (): number => Object.keys(state.operations).length,
    [state.operations]
  );

  const shouldShowGlobalLoader = useCallback((): boolean => {
    return state.highPriorityLoading || (state.globalLoading && getActiveOperationsCount() > 2);
  }, [state.highPriorityLoading, state.globalLoading, getActiveOperationsCount]);

  const getEstimatedTimeRemaining = useCallback(
    (id: string): number | null => {
      const operation = state.operations[id];
      if (!operation) return null;

      const elapsed = Date.now() - operation.startTime;
      const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
      const remaining = timeout - elapsed;

      return remaining > 0 ? remaining : null;
    },
    [state.operations, state.adaptiveSettings.defaultTimeout]
  );

  const getStats = useCallback((): LoadingStats => state.stats, [state.stats]);

  // Type-specific convenience methods
  const startPageLoading = useCallback(
    (pageId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
      startOperation({
        id: `page-${pageId}`,
        type: 'page',
        message: message || 'Loading page...',
        priority: options.priority || 'high',
        timeout: options.timeout,
        maxRetries: options.retryLimit ?? 2,
        connectionAware: options.connectionAware ?? true,
        retryStrategy: options.retryStrategy || 'exponential',
        retryDelay: options.retryDelay || DEFAULT_RETRY_DELAY,
        metadata: options.metadata,
      });
    },
    [startOperation]
  );

  const completePageLoading = useCallback(
    (pageId: string, success: boolean = true, error?: Error) => {
      completeOperation(`page-${pageId}`, success, error);
    },
    [completeOperation]
  );

  const startComponentLoading = useCallback(
    (componentId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
      startOperation({
        id: `component-${componentId}`,
        type: 'component',
        message: message || 'Loading component...',
        priority: options.priority || 'medium',
        timeout: options.timeout,
        maxRetries: options.retryLimit ?? 1,
        connectionAware: options.connectionAware ?? true,
        retryStrategy: options.retryStrategy || 'linear',
        retryDelay: options.retryDelay || DEFAULT_RETRY_DELAY,
        metadata: options.metadata,
      });
    },
    [startOperation]
  );

  const completeComponentLoading = useCallback(
    (componentId: string, success: boolean = true, error?: Error) => {
      completeOperation(`component-${componentId}`, success, error);
    },
    [completeOperation]
  );

  const startApiLoading = useCallback(
    (apiId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
      startOperation({
        id: `api-${apiId}`,
        type: 'api',
        message: message || 'Loading data...',
        priority: options.priority || 'medium',
        timeout: options.timeout || 12000,
        maxRetries: options.retryLimit ?? 3,
        connectionAware: options.connectionAware ?? true,
        retryStrategy: options.retryStrategy || 'exponential',
        retryDelay: options.retryDelay || DEFAULT_RETRY_DELAY,
        metadata: options.metadata,
      });
    },
    [startOperation]
  );

  const completeApiLoading = useCallback(
    (apiId: string, success: boolean = true, error?: Error) => {
      completeOperation(`api-${apiId}`, success, error);
    },
    [completeOperation]
  );

  const startAssetLoading = useCallback(
    (assetId: string, message?: string, options: Partial<LoadingOptions> = {}) => {
      startOperation({
        id: `asset-${assetId}`,
        type: 'asset',
        message: message || 'Loading assets...',
        priority: options.priority || 'low',
        timeout: options.timeout || 20000,
        maxRetries: options.retryLimit ?? 1,
        connectionAware: options.connectionAware ?? true,
        retryStrategy: options.retryStrategy || 'linear',
        retryDelay: options.retryDelay || 2000,
        metadata: options.metadata,
      });
    },
    [startOperation]
  );

  const completeAssetLoading = useCallback(
    (assetId: string, success: boolean = true, error?: Error) => {
      completeOperation(`asset-${assetId}`, success, error);
    },
    [completeOperation]
  );

  // Memoized context value
  const value: LoadingContextValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Alias export for compatibility
export const UnifiedLoadingProvider = LoadingProvider;
