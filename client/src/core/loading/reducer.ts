/**
 * Unified Loading State Reducer - Consolidated from multiple implementations
 * Handles all loading state transitions with optimized logic and error integration
 */

import { LoadingStateData, LoadingAction, LoadingOperation, ConnectionInfo, AdaptiveSettings, AssetLoadingProgress, LoadingStats } from '@client/types';

export function loadingReducer(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  switch (action.type) {
    case 'START_OPERATION': {
      const operation: LoadingOperation = {
        ...action.payload,
        startTime: Date.now(),
        retryCount: 0,
        timeoutWarningShown: false,
        cancelled: false,
      };

      const newOperations = {
        ...state.operations,
        [operation.id]: operation,
      };

      const newStats: LoadingStats = {
        ...state.stats,
        totalOperations: state.stats.totalOperations + 1,
        activeOperations: Object.keys(newOperations).length,
        lastUpdate: Date.now(),
      };

      return {
        ...state,
        operations: newOperations,
        globalLoading: Object.keys(newOperations).length > 0,
        highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
        stats: newStats,
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
      const completedOperation = newOperations[id];

      if (completedOperation) {
        delete newOperations[id];

        const completionTime = Date.now() - completedOperation.startTime;
        const newStats: LoadingStats = {
          ...state.stats,
          activeOperations: Object.keys(newOperations).length,
          completedOperations: state.stats.completedOperations + 1,
          failedOperations: action.payload.success ? state.stats.failedOperations : state.stats.failedOperations + 1,
          averageLoadTime: calculateNewAverageLoadTime(
            state.stats.averageLoadTime,
            state.stats.completedOperations,
            completionTime
          ),
          lastUpdate: Date.now(),
        };

        return {
          ...state,
          operations: newOperations,
          globalLoading: Object.keys(newOperations).length > 0,
          highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
          stats: newStats,
        };
      }

      return state;
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
        cancelled: false,
      };

      const newStats: LoadingStats = {
        ...state.stats,
        retryRate: calculateRetryRate(state.stats, Object.values(state.operations).length),
        lastUpdate: Date.now(),
      };

      return {
        ...state,
        operations: {
          ...state.operations,
          [id]: updatedOperation,
        },
        stats: newStats,
      };
    }

    case 'CANCEL_OPERATION': {
      const { id } = action.payload;
      const newOperations = { ...state.operations };
      const cancelledOperation = newOperations[id];

      if (cancelledOperation) {
        newOperations[id] = { ...cancelledOperation, cancelled: true };
        delete newOperations[id]; // Remove cancelled operations

        const newStats: LoadingStats = {
          ...state.stats,
          activeOperations: Object.keys(newOperations).length,
          lastUpdate: Date.now(),
        };

        return {
          ...state,
          operations: newOperations,
          globalLoading: Object.keys(newOperations).length > 0,
          highPriorityLoading: Object.values(newOperations).some(op => op.priority === 'high'),
          stats: newStats,
        };
      }

      return state;
    }

    case 'TIMEOUT_OPERATION': {
      const { id } = action.payload;
      const operation = state.operations[id];

      if (!operation) return state;

      const timeoutError = new Error(`Operation timed out after ${operation.timeout || 30000}ms`);
      const updatedOperation = {
        ...operation,
        error: timeoutError,
      };

      const newStats: LoadingStats = {
        ...state.stats,
        failedOperations: state.stats.failedOperations + 1,
        lastUpdate: Date.now(),
      };

      return {
        ...state,
        operations: {
          ...state.operations,
          [id]: updatedOperation,
        },
        stats: newStats,
      };
    }

    case 'UPDATE_CONNECTION': {
      const { connectionInfo, isOnline } = action.payload;

      // Update adaptive settings based on connection
      const adaptiveSettings: AdaptiveSettings = {
        ...state.adaptiveSettings,
        enableAnimations: isOnline && connectionInfo.type !== 'slow',
        maxConcurrentOperations: getMaxConcurrentOperations(connectionInfo),
        defaultTimeout: getDefaultTimeout(connectionInfo),
        retryDelay: getRetryDelay(connectionInfo),
        connectionMultiplier: getConnectionMultiplier(connectionInfo),
      };

      const connectionImpact = calculateConnectionImpact(connectionInfo, isOnline);

      const newStats: LoadingStats = {
        ...state.stats,
        connectionImpact,
        lastUpdate: Date.now(),
      };

      return {
        ...state,
        connectionInfo,
        isOnline,
        adaptiveSettings,
        stats: newStats,
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

    case 'UPDATE_STATS': {
      return {
        ...state,
        stats: {
          ...state.stats,
          ...action.payload,
          lastUpdate: Date.now(),
        },
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

// Helper functions for calculations
function calculateNewAverageLoadTime(currentAverage: number, completedCount: number, newTime: number): number {
  if (completedCount === 0) return newTime;
  return (currentAverage * completedCount + newTime) / (completedCount + 1);
}

function calculateRetryRate(stats: LoadingStats, activeOperations: number): number {
  const totalOperations = stats.totalOperations + activeOperations;
  if (totalOperations === 0) return 0;

  // Estimate retry rate based on current stats
  const estimatedRetries = stats.retryRate * stats.totalOperations;
  return estimatedRetries / totalOperations;
}

function getMaxConcurrentOperations(connectionInfo: ConnectionInfo): number {
  switch (connectionInfo.type) {
    case 'slow':
      return 2;
    case 'offline':
      return 1;
    default:
      return 4;
  }
}

function getDefaultTimeout(connectionInfo: ConnectionInfo): number {
  switch (connectionInfo.type) {
    case 'slow':
      return 60000; // 60 seconds
    case 'offline':
      return 120000; // 2 minutes
    default:
      return 30000; // 30 seconds
  }
}

function getRetryDelay(connectionInfo: ConnectionInfo): number {
  switch (connectionInfo.type) {
    case 'slow':
      return 2000; // 2 seconds
    case 'offline':
      return 5000; // 5 seconds
    default:
      return 1000; // 1 second
  }
}

function getConnectionMultiplier(connectionInfo: ConnectionInfo): number {
  switch (connectionInfo.type) {
    case 'slow':
      return 2;
    case 'offline':
      return 3;
    default:
      return 1;
  }
}

function calculateConnectionImpact(connectionInfo: ConnectionInfo, isOnline: boolean): 'high' | 'medium' | 'low' {
  if (!isOnline) return 'high';
  if (connectionInfo.type === 'slow') return 'high';
  if (connectionInfo.type === 'unknown') return 'medium';
  return 'low';
}
