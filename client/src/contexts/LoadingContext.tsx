import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useConnectionAware } from '@/hooks/useConnectionAware';
import { useOnlineStatus } from '@/hooks/use-online-status';

export interface LoadingOperation {
  id: string;
  type: 'page' | 'component' | 'api' | 'asset' | 'progressive';
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
}

export interface LoadingContextState {
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
  };
}

type LoadingAction =
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'startTime' | 'retryCount'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: { id: string; success: boolean; error?: Error } }
  | { type: 'RETRY_OPERATION'; payload: { id: string } }
  | { type: 'CANCEL_OPERATION'; payload: { id: string } }
  | { type: 'UPDATE_CONNECTION'; payload: { connectionInfo: any; isOnline: boolean } }
  | { type: 'UPDATE_ADAPTIVE_SETTINGS'; payload: Partial<LoadingContextState['adaptiveSettings']> };

const initialState: LoadingContextState = {
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
  },
};

function loadingReducer(state: LoadingContextState, action: LoadingAction): LoadingContextState {
  switch (action.type) {
    case 'START_OPERATION': {
      const operation: LoadingOperation = {
        ...action.payload,
        startTime: Date.now(),
        retryCount: 0,
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

    default:
      return state;
  }
}

interface LoadingContextValue {
  state: LoadingContextState;
  startOperation: (operation: Omit<LoadingOperation, 'startTime' | 'retryCount'>) => void;
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
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);
  const connectionInfo = useConnectionAware();
  const isOnline = useOnlineStatus();

  // Update connection info when it changes
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { connectionInfo, isOnline },
    });
  }, [connectionInfo, isOnline]);

  // Monitor operations for timeouts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      Object.entries(state.operations).forEach(([id, operation]) => {
        const elapsed = now - operation.startTime;
        const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
        
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
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [state.operations, state.adaptiveSettings.defaultTimeout]);

  const startOperation = useCallback((operation: Omit<LoadingOperation, 'startTime' | 'retryCount'>) => {
    // Prevent duplicate operations by checking current state
    if (state.operations[operation.id]) {
      console.warn(`Operation ${operation.id} is already running`);
      return;
    }

    // Check if we should start this operation based on connection and priority
    const activeOperations = Object.values(state.operations);
    const totalCount = activeOperations.length;

    // Limit concurrent operations based on connection
    if (totalCount >= state.adaptiveSettings.maxConcurrentOperations) {
      if (operation.priority !== 'high') {
        console.warn(`Delaying operation ${operation.id} due to concurrent operation limit`);
        // Could implement a queue here
        return;
      }
    }

    // Skip low priority operations on slow connections
    if (!isOnline || (connectionInfo?.connectionType === 'slow' && operation.priority === 'low')) {
      console.warn(`Skipping operation ${operation.id} due to connection constraints`);
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

    // Add delay before retry based on connection
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
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = (): LoadingContextValue => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};

// Convenience hooks for specific loading scenarios
export const usePageLoading = () => {
  const { startOperation, completeOperation, getOperationsByType } = useLoadingContext();
  
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

  const getPageLoadingOperations = useCallback(() => {
    return getOperationsByType('page');
  }, [getOperationsByType]);

  return {
    startPageLoading,
    completePageLoading,
    getPageLoadingOperations,
  };
};

export const useComponentLoading = () => {
  const { startOperation, completeOperation, updateOperation, getOperationsByType } = useLoadingContext();
  
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

  const updateComponentProgress = useCallback((componentId: string, progress: number, message?: string) => {
    updateOperation(`component-${componentId}`, { progress, message });
  }, [updateOperation]);

  const completeComponentLoading = useCallback((componentId: string, success: boolean = true, error?: Error) => {
    completeOperation(`component-${componentId}`, success, error);
  }, [completeOperation]);

  const getComponentLoadingOperations = useCallback(() => {
    return getOperationsByType('component');
  }, [getOperationsByType]);

  return {
    startComponentLoading,
    updateComponentProgress,
    completeComponentLoading,
    getComponentLoadingOperations,
  };
};

export const useApiLoading = () => {
  const { startOperation, completeOperation, updateOperation, getOperationsByType } = useLoadingContext();
  
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

  const updateApiProgress = useCallback((apiId: string, progress: number, message?: string) => {
    updateOperation(`api-${apiId}`, { progress, message });
  }, [updateOperation]);

  const completeApiLoading = useCallback((apiId: string, success: boolean = true, error?: Error) => {
    completeOperation(`api-${apiId}`, success, error);
  }, [completeOperation]);

  const getApiLoadingOperations = useCallback(() => {
    return getOperationsByType('api');
  }, [getOperationsByType]);

  return {
    startApiLoading,
    updateApiProgress,
    completeApiLoading,
    getApiLoadingOperations,
  };
};