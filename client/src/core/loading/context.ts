/**
 * Unified Loading Context - Consolidated from UnifiedLoadingContext and LoadingContext
 * Best practices: Connection awareness, asset loading integration, timeout management
 */

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { LoadingState, LoadingAction, LoadingOperation, LoadingOptions, LoadingPriority } from './types';
import { loadingReducer } from './reducer';
import { logger } from '@shared/core/src/observability/logging';

const initialState: LoadingState = {
  operations: {},
  globalLoading: false,
  highPriorityLoading: false,
  connectionInfo: null,
  isOnline: true,
  adaptiveSettings: {
    enableAnimations: true,
    maxConcurrentOperations: 4,
    defaultTimeout: 30000,
    retryDelay: 1000,
    timeoutWarningThreshold: 0.7,
  },
  assetLoadingProgress: {
    loaded: 0,
    total: 0,
    phase: 'preload',
  },
};

export interface LoadingContextValue {
  state: LoadingState;
  startOperation: (operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown'>) => void;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  retryOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  getOperation: (id: string) => LoadingOperation | undefined;
  getOperationsByType: (type: LoadingOperation['type']) => LoadingOperation[];
  getOperationsByPriority: (priority: LoadingOperation['priority']) => LoadingOperation[];
  isOperationActive: (id: string) => boolean;
  getActiveOperationsCount: () => number;
  shouldShowGlobalLoader: () => boolean;
  getEstimatedTimeRemaining: (id: string) => number | null;

  // Convenience methods
  startPageLoading: (pageId: string, message?: string) => void;
  completePageLoading: (pageId: string, success?: boolean, error?: Error) => void;
  startComponentLoading: (componentId: string, message?: string, priority?: LoadingPriority) => void;
  completeComponentLoading: (componentId: string, success?: boolean, error?: Error) => void;
  startApiLoading: (apiId: string, message?: string, priority?: LoadingPriority) => void;
  completeApiLoading: (apiId: string, success?: boolean, error?: Error) => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function createLoadingProvider(
  useConnectionAware: () => any,
  useOnlineStatus: () => boolean,
  assetLoadingManager?: any
) {
  return function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(loadingReducer, initialState);
    const connectionInfo = useConnectionAware();
    const isOnline = useOnlineStatus();

    // Asset loading progress subscription (if available)
    useEffect(() => {
      if (assetLoadingManager?.onProgress) {
        const unsubscribe = assetLoadingManager.onProgress((progress: any) => {
          dispatch({ type: 'UPDATE_ASSET_PROGRESS', payload: progress });
        });
        return unsubscribe;
      }
    }, []);

    // Update connection info when it changes
    useEffect(() => {
      dispatch({
        type: 'UPDATE_CONNECTION',
        payload: { connectionInfo, isOnline: isOnline ?? true },
      });
    }, [connectionInfo, isOnline]);

    // Monitor operations for timeouts and warnings
    useEffect(() => {
      const interval = setInterval(() => {
        const now = Date.now();

        Object.entries(state.operations).forEach(([id, operation]) => {
          const elapsed = now - operation.startTime;
          const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
          const warningThreshold = timeout * state.adaptiveSettings.timeoutWarningThreshold;

          // Show timeout warning
          if (elapsed > warningThreshold && !operation.timeoutWarningShown) {
            dispatch({ type: 'SHOW_TIMEOUT_WARNING', payload: { id } });
          }

          // Timeout operation
          if (elapsed > timeout) {
            dispatch({
              type: 'COMPLETE_OPERATION',
              payload: {
                id,
                success: false,
                error: new Error('Operation timed out'),
              },
            });
          }
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [state.operations, state.adaptiveSettings]);

    const startOperation = useCallback((operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown'>) => {
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
      if (!isOnline || (connectionInfo?.connectionType === 'slow' && operation.priority === 'low')) {
        logger.warn(`Skipping operation ${operation.id} due to connection constraints`);
        return;
      }

      dispatch({ type: 'START_OPERATION', payload: operation });
    }, [state.operations, state.adaptiveSettings.maxConcurrentOperations, isOnline, connectionInfo]);

    const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
      dispatch({ type: 'UPDATE_OPERATION', payload: { id, updates } });
    }, []);

    const completeOperation = useCallback((id: string, success: boolean, error?: Error) => {
      dispatch({ type: 'COMPLETE_OPERATION', payload: { id, success, error } });
    }, []);

    const retryOperation = useCallback((id: string) => {
      const operation = state.operations[id];
      if (!operation) return;

      if (operation.retryCount >= operation.maxRetries) {
        completeOperation(id, false, new Error('Maximum retry attempts reached'));
        return;
      }

      // Exponential backoff with connection-aware delay
      const delay = state.adaptiveSettings.retryDelay * Math.pow(2, operation.retryCount);

      setTimeout(() => {
        dispatch({ type: 'RETRY_OPERATION', payload: { id } });
      }, delay);
    }, [state.operations, state.adaptiveSettings.retryDelay, completeOperation]);

    const cancelOperation = useCallback((id: string) => {
      dispatch({ type: 'CANCEL_OPERATION', payload: { id } });
    }, []);

    const getOperation = useCallback((id: string) => {
      return state.operations[id];
    }, [state.operations]);

    const getOperationsByType = useCallback((type: LoadingOperation['type']) => {
      return Object.values(state.operations).filter(op => op.type === type);
    }, [state.operations]);

    const getOperationsByPriority = useCallback((priority: LoadingOperation['priority']) => {
      return Object.values(state.operations).filter(op => op.priority === priority);
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

    // Convenience methods
    const startPageLoading = useCallback((pageId: string, message?: string) => {
      startOperation({
        id: `page-${pageId}`,
        type: 'page',
        message: message || 'Loading page...',
        priority: 'high',
        maxRetries: 2,
        connectionAware: true,
      });
    }, [startOperation]);

    const completePageLoading = useCallback((pageId: string, success: boolean = true, error?: Error) => {
      completeOperation(`page-${pageId}`, success, error);
    }, [completeOperation]);

    const startComponentLoading = useCallback((componentId: string, message?: string, priority: LoadingPriority = 'medium') => {
      startOperation({
        id: `component-${componentId}`,
        type: 'component',
        message: message || 'Loading component...',
        priority,
        maxRetries: 1,
        connectionAware: true,
      });
    }, [startOperation]);

    const completeComponentLoading = useCallback((componentId: string, success: boolean = true, error?: Error) => {
      completeOperation(`component-${componentId}`, success, error);
    }, [completeOperation]);

    const startApiLoading = useCallback((apiId: string, message?: string, priority: LoadingPriority = 'medium') => {
      startOperation({
        id: `api-${apiId}`,
        type: 'api',
        message: message || 'Loading data...',
        priority,
        maxRetries: 3,
        connectionAware: true,
      });
    }, [startOperation]);

    const completeApiLoading = useCallback((apiId: string, success: boolean = true, error?: Error) => {
      completeOperation(`api-${apiId}`, success, error);
    }, [completeOperation]);

    const value: LoadingContextValue = {
      state,
      startOperation,
      updateOperation,
      completeOperation,
      retryOperation,
      cancelOperation,
      getOperation,
      getOperationsByType,
      getOperationsByPriority,
      isOperationActive,
      getActiveOperationsCount,
      shouldShowGlobalLoader,
      getEstimatedTimeRemaining,
      startPageLoading,
      completePageLoading,
      startComponentLoading,
      completeComponentLoading,
      startApiLoading,
      completeApiLoading,
    };

    return (
      <LoadingContext.Provider value={value}>
        {children}
      </LoadingContext.Provider>
    );
  };
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}