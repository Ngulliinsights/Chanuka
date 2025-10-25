import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useConnectionAware } from '../hooks/useConnectionAware';
import { useOnlineStatus } from '../hooks/use-online-status';
import { logger } from '../utils/browser-logger';
import { assetLoadingManager } from '../utils/asset-loading';

// Types for unified loading system
export type LoadingType = 'page' | 'component' | 'api' | 'asset' | 'progressive';

export interface LoadingOperation {
  id: string;
  type: LoadingType;
  message?: string;
  progress?: number;
  stage?: string;
  priority: 'high' | 'medium' | 'low';
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
  adaptiveSettings: {
    enableAnimations: boolean;
    maxConcurrentOperations: number;
    defaultTimeout: number;
    retryDelay: number;
    timeoutWarningThreshold: number;
  };
  assetLoadingProgress: {
    loaded: number;
    total: number;
    phase: string;
    currentAsset?: string;
  };
}

type LoadingAction =
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: { id: string; success: boolean; error?: Error } }
  | { type: 'RETRY_OPERATION'; payload: { id: string } }
  | { type: 'CANCEL_OPERATION'; payload: { id: string } }
  | { type: 'UPDATE_CONNECTION'; payload: { connectionInfo: any; isOnline: boolean } }
  | { type: 'UPDATE_ADAPTIVE_SETTINGS'; payload: Partial<LoadingState['adaptiveSettings']> }
  | { type: 'UPDATE_ASSET_PROGRESS'; payload: LoadingState['assetLoadingProgress'] }
  | { type: 'SHOW_TIMEOUT_WARNING'; payload: { id: string } };

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

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START_OPERATION': {
      const operation: LoadingOperation = {
        ...action.payload,
        startTime: Date.now(),
        retryCount: 0,
        timeoutWarningShown: false,
      };

      const newOperations = {
        ...state.operations,
        [operation.id]: operation,
      };

      return {
        ...state,
        operations: newOperations,
        globalLoading: Object.keys(newOperations).length > 0,
        highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
      };
    }

    case 'UPDATE_OPERATION': {
      const { id, updates } = action.payload;
      const existingOperation = state.operations[id];

      if (!existingOperation) return state;

      const updatedOperation = { ...existingOperation, ...updates };
      const newOperations = {
        ...state.operations,
        [id]: updatedOperation,
      };

      return {
        ...state,
        operations: newOperations,
      };
    }

    case 'COMPLETE_OPERATION': {
      const { id, success, error } = action.payload;
      const newOperations = { ...state.operations };
      delete newOperations[id];

      return {
        ...state,
        operations: newOperations,
        globalLoading: Object.keys(newOperations).length > 0,
        highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
      };
    }

    case 'RETRY_OPERATION': {
      const { id } = action.payload;
      const operation = state.operations[id];

      if (!operation) return state;

      const updatedOperation = {
        ...operation,
        retryCount: operation.retryCount + 1,
        error: undefined,
        startTime: Date.now(),
        timeoutWarningShown: false,
      };

      return {
        ...state,
        operations: {
          ...state.operations,
          [id]: updatedOperation,
        },
      };
    }

    case 'CANCEL_OPERATION': {
      const { id } = action.payload;
      const newOperations = { ...state.operations };
      delete newOperations[id];

      return {
        ...state,
        operations: newOperations,
        globalLoading: Object.keys(newOperations).length > 0,
        highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
      };
    }

    case 'UPDATE_CONNECTION': {
      const { connectionInfo, isOnline } = action.payload;

      // Update adaptive settings based on connection
      const adaptiveSettings = {
        ...state.adaptiveSettings,
        enableAnimations: isOnline && connectionInfo?.connectionType !== 'slow',
        maxConcurrentOperations: connectionInfo?.connectionType === 'slow' ? 2 : 4,
        defaultTimeout: connectionInfo?.connectionType === 'slow' ? 60000 : 30000,
        retryDelay: connectionInfo?.connectionType === 'slow' ? 2000 : 1000,
      };

      return {
        ...state,
        connectionInfo,
        isOnline,
        adaptiveSettings,
      };
    }

    case 'UPDATE_ADAPTIVE_SETTINGS': {
      return {
        ...state,
        adaptiveSettings: {
          ...state.adaptiveSettings,
          ...action.payload,
        },
      };
    }

    case 'UPDATE_ASSET_PROGRESS': {
      return {
        ...state,
        assetLoadingProgress: action.payload,
      };
    }

    case 'SHOW_TIMEOUT_WARNING': {
      const { id } = action.payload;
      const operation = state.operations[id];

      if (!operation) return state;

      return {
        ...state,
        operations: {
          ...state.operations,
          [id]: { ...operation, timeoutWarningShown: true },
        },
      };
    }

    default:
      return state;
  }
}

interface UnifiedLoadingContextValue {
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

  // Asset loading integration
  loadAsset: (url: string, type: 'script' | 'style' | 'image' | 'font' | 'critical', config?: any) => Promise<any>;
  loadAssets: (assets: any[], phase?: string) => Promise<any[]>;
  preloadCriticalAssets: () => Promise<void>;
  getAssetLoadingStats: () => any;

  // Convenience methods
  startPageLoading: (pageId: string, message?: string) => void;
  completePageLoading: (pageId: string, success?: boolean, error?: Error) => void;
  startComponentLoading: (componentId: string, message?: string, priority?: 'high' | 'medium' | 'low') => void;
  completeComponentLoading: (componentId: string, success?: boolean, error?: Error) => void;
  startApiLoading: (apiId: string, message?: string, priority?: 'high' | 'medium' | 'low') => void;
  completeApiLoading: (apiId: string, success?: boolean, error?: Error) => void;
}

const UnifiedLoadingContext = createContext<UnifiedLoadingContextValue | undefined>(undefined);

export const UnifiedLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);
  const connectionInfo = useConnectionAware();
  const isOnline = useOnlineStatus();

  // Asset loading progress subscription
  useEffect(() => {
    const unsubscribe = assetLoadingManager.onProgress((progress) => {
      dispatch({ type: 'UPDATE_ASSET_PROGRESS', payload: progress });
    });
    return unsubscribe;
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
    }, 1000); // Check every second

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

  // Asset loading integration
  const loadAsset = useCallback(async (url: string, type: 'script' | 'style' | 'image' | 'font' | 'critical', config?: any) => {
    return assetLoadingManager.loadAsset(url, type, config);
  }, []);

  const loadAssets = useCallback(async (assets: any[], phase?: string) => {
    return assetLoadingManager.loadAssets(assets, phase as any);
  }, []);

  const preloadCriticalAssets = useCallback(async () => {
    return assetLoadingManager.preloadCriticalAssets();
  }, []);

  const getAssetLoadingStats = useCallback(() => {
    return assetLoadingManager.getLoadingStats();
  }, []);

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

  const startComponentLoading = useCallback((componentId: string, message?: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
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

  const startApiLoading = useCallback((apiId: string, message?: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
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

  const value: UnifiedLoadingContextValue = {
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
    loadAsset,
    loadAssets,
    preloadCriticalAssets,
    getAssetLoadingStats,
    startPageLoading,
    completePageLoading,
    startComponentLoading,
    completeComponentLoading,
    startApiLoading,
    completeApiLoading,
  };

  return (
    <UnifiedLoadingContext.Provider value={value}>
      {children}
    </UnifiedLoadingContext.Provider>
  );
};

export const useUnifiedLoading = (): UnifiedLoadingContextValue => {
  const context = useContext(UnifiedLoadingContext);
  if (!context) {
    throw new Error('useUnifiedLoading must be used within a UnifiedLoadingProvider');
  }
  return context;
};

// Convenience hooks for specific loading scenarios
export const usePageLoading = () => {
  const { startPageLoading, completePageLoading, getOperationsByType } = useUnifiedLoading();

  return {
    startPageLoading,
    completePageLoading,
    getPageLoadingOperations: () => getOperationsByType('page'),
  };
};

export const useComponentLoading = () => {
  const { startComponentLoading, completeComponentLoading, updateOperation, getOperationsByType } = useUnifiedLoading();

  const updateComponentProgress = useCallback((componentId: string, progress: number, message?: string) => {
    updateOperation(`component-${componentId}`, { progress, message });
  }, [updateOperation]);

  return {
    startComponentLoading,
    updateComponentProgress,
    completeComponentLoading,
    getComponentLoadingOperations: () => getOperationsByType('component'),
  };
};

export const useApiLoading = () => {
  const { startApiLoading, completeApiLoading, updateOperation, getOperationsByType } = useUnifiedLoading();

  const updateApiProgress = useCallback((apiId: string, progress: number, message?: string) => {
    updateOperation(`api-${apiId}`, { progress, message });
  }, [updateOperation]);

  return {
    startApiLoading,
    updateApiProgress,
    completeApiLoading,
    getApiLoadingOperations: () => getOperationsByType('api'),
  };
};

export const useAssetLoading = () => {
  const { loadAsset, loadAssets, preloadCriticalAssets, getAssetLoadingStats, state } = useUnifiedLoading();

  return {
    progress: state.assetLoadingProgress,
    loadAsset,
    loadAssets,
    preloadCriticalAssets,
    getStats: getAssetLoadingStats,
  };
};