/**
 * Loading State Reducer - Consolidated from multiple implementations
 * Handles all loading state transitions with optimized logic
 */

import { LoadingState, LoadingAction, LoadingOperation } from './types';

export function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
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