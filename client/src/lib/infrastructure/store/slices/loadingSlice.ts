/**
 * Loading State Management with Redux Toolkit
 *
 * Unified loading state management with connection awareness, timeout handling,
 * and integration with the core loading context system.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { LoadingOperation, LoadingStats, LoadingType, LoadingPriority, AssetLoadingProgress } from '@client/lib/types/loading';
import { logger } from '@client/lib/utils/logger';

// Helper type to remove readonly modifiers for Redux state (Immer handles mutability)
type MutableLoadingOperation = {
  -readonly [K in keyof LoadingOperation]: LoadingOperation[K] extends ReadonlyArray<infer U> | undefined
    ? U[] | undefined
    : LoadingOperation[K];
};

// Extended LoadingOperation with mutable properties for Redux state
export type ExtendedLoadingOperation = MutableLoadingOperation;

// Extended type definitions
interface ConnectionInfo {
  type: 'fast' | 'slow' | 'offline' | 'unknown';
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface AdaptiveSettings {
  enableAnimations: boolean;
  maxConcurrentOperations: number;
  defaultTimeout: number;
  retryDelay: number;
  timeoutWarningThreshold: number;
  connectionMultiplier: number;
}

// Extended types that augment the base loading types
// Note: ExtendedLoadingOperation was removed as it clashed with LoadingOperation

interface ExtendedLoadingStats extends LoadingStats {
  completedOperations: number;
  totalOperations: number;
  failedOperations: number;
  averageLoadTime: number;
  activeOperations: number;
  retryRate: number;
  successRate: number;
  connectionImpact: 'low' | 'medium' | 'high';
  lastUpdate: number;
  currentQueueLength: number;
  peakQueueLength: number;
}

// Loading state interface for Redux store
interface LoadingStateData {
  operations: Record<string, MutableLoadingOperation>;
  globalLoading: boolean;
  highPriorityLoading: boolean;
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  assetLoadingProgress: AssetLoadingProgress;
  stats: ExtendedLoadingStats;
}

// Initial state based on core loading types
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
    status: 'pending',
  },
  stats: {
    loaded: 0,
    failed: 0,
    connectionType: 'fast',
    isOnline: navigator.onLine,
    completedOperations: 0,
    totalOperations: 0,
    failedOperations: 0,
    averageLoadTime: 0,
    activeOperations: 0,
    retryRate: 0,
    successRate: 0,
    connectionImpact: 'low',
    lastUpdate: Date.now(),
    currentQueueLength: 0,
    peakQueueLength: 0,
  },
};

// Async thunks for loading operations
export const startLoadingOperation = createAsyncThunk(
  'loading/startOperation',
  async (
    operation: Omit<
      LoadingOperation,
      'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled' | 'state'
    >,
    { rejectWithValue }
  ) => {
    try {
      // Validate operation
      if (!operation.id || !operation.type) {
        throw new Error('Invalid operation: missing id or type');
      }

      return operation;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start operation');
    }
  }
);

export const completeLoadingOperation = createAsyncThunk(
  'loading/completeOperation',
  async (
    { id, success, error }: { id: string; success: boolean; error?: string },
    { rejectWithValue }
  ) => {
    try {
      return { id, success, error };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to complete operation');
    }
  }
);

export const retryLoadingOperation = createAsyncThunk(
  'loading/retryOperation',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const loadingState = getState() as { loading: LoadingStateData };
      const operation = loadingState.loading.operations[id];

      if (!operation) {
        throw new Error(`Operation ${id} not found`);
      }

      if (operation.retryCount >= operation.maxRetries) {
        throw new Error(`Maximum retry attempts (${operation.maxRetries}) reached`);
      }

      return { id };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to retry operation');
    }
  }
);

export const timeoutLoadingOperation = createAsyncThunk(
  'loading/timeoutOperation',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const loadingState = getState() as { loading: LoadingStateData };
      const operation = loadingState.loading.operations[id];

      if (!operation) {
        throw new Error(`Operation ${id} not found`);
      }

      const timeout = operation.timeout || loadingState.loading.adaptiveSettings.defaultTimeout;
      const timeoutError = `Operation timed out after ${timeout}ms`;

      return { id, error: timeoutError };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to timeout operation'
      );
    }
  }
);

// Stats update type
type StatsUpdateType =
  | 'increment_completed'
  | 'increment_failed'
  | 'update_average_time'
  | 'increment_total';

interface StatsUpdate {
  type: StatsUpdateType;
  payload?: { loadTime?: number };
}

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    // Connection and network state
    updateConnectionInfo: (state, action: PayloadAction<ConnectionInfo>) => {
      state.connectionInfo = action.payload;

      // Adjust adaptive settings based on connection
      switch (action.payload.type) {
        case 'fast':
          state.adaptiveSettings.connectionMultiplier = 1;
          state.adaptiveSettings.maxConcurrentOperations = 6;
          break;
        case 'slow':
          state.adaptiveSettings.connectionMultiplier = 2;
          state.adaptiveSettings.maxConcurrentOperations = 2;
          break;
        case 'offline':
          state.adaptiveSettings.connectionMultiplier = 5;
          state.adaptiveSettings.maxConcurrentOperations = 1;
          break;
        default:
          state.adaptiveSettings.connectionMultiplier = 1.5;
          state.adaptiveSettings.maxConcurrentOperations = 4;
      }

      state.stats.connectionImpact =
        action.payload.type === 'offline'
          ? 'high'
          : action.payload.type === 'slow'
            ? 'medium'
            : 'low';
      state.stats.lastUpdate = Date.now();
    },

    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (!action.payload) {
        state.connectionInfo.type = 'offline';
      }
    },

    // Adaptive settings
    updateAdaptiveSettings: (state, action: PayloadAction<Partial<AdaptiveSettings>>) => {
      state.adaptiveSettings = { ...state.adaptiveSettings, ...action.payload };
    },

    // Asset loading progress
    updateAssetProgress: (state, action: PayloadAction<AssetLoadingProgress>) => {
      state.assetLoadingProgress = action.payload;
    },

    // Operation management
    updateOperation: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<LoadingOperation> }>
    ) => {
      const { id, updates } = action.payload;
      if (state.operations[id]) {
        // Handle dependencies separately to convert readonly to mutable
        const { dependencies, ...restUpdates } = updates;
        state.operations[id] = { 
          ...state.operations[id], 
          ...restUpdates,
          // Convert readonly dependencies to mutable if present
          ...(dependencies !== undefined ? { dependencies: [...dependencies] } : {})
        };
      }
    },

    cancelOperation: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.operations[id]) {
        state.operations[id].cancelled = true;
      }
    },

    showTimeoutWarning: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.operations[id]) {
        state.operations[id].timeoutWarningShown = true;
      }
    },

    // Global loading state
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },

    setHighPriorityLoading: (state, action: PayloadAction<boolean>) => {
      state.highPriorityLoading = action.payload;
    },

    // Stats management
    updateStats: (state, action: PayloadAction<Partial<ExtendedLoadingStats>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },

    // Atomic statistics updates to prevent race conditions
    updateStatsAtomic: (state, action: PayloadAction<StatsUpdate>) => {
      const { type, payload } = action.payload;

      switch (type) {
        case 'increment_completed':
          state.stats.completedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );
          break;

        case 'increment_failed':
          state.stats.failedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );
          break;

        case 'update_average_time':
          if (payload?.loadTime && typeof payload.loadTime === 'number') {
            const totalCompleted = state.stats.completedOperations;
            if (totalCompleted > 0) {
              state.stats.averageLoadTime =
                (state.stats.averageLoadTime * (totalCompleted - 1) + payload.loadTime) /
                totalCompleted;
            }
          }
          break;

        case 'increment_total':
          state.stats.totalOperations++;
          break;
      }

      state.stats.lastUpdate = Date.now();
    },

    // Batch stats updates to reduce race conditions
    batchStatsUpdate: (state, action: PayloadAction<StatsUpdate[]>) => {
      action.payload.forEach(update => {
        const { type, payload } = update;

        switch (type) {
          case 'increment_completed':
            state.stats.completedOperations++;
            state.stats.totalOperations = Math.max(
              state.stats.totalOperations,
              state.stats.completedOperations + state.stats.failedOperations
            );
            break;

          case 'increment_failed':
            state.stats.failedOperations++;
            state.stats.totalOperations = Math.max(
              state.stats.totalOperations,
              state.stats.completedOperations + state.stats.failedOperations
            );
            break;

          case 'update_average_time':
            if (payload?.loadTime && typeof payload.loadTime === 'number') {
              const totalCompleted = state.stats.completedOperations;
              if (totalCompleted > 0) {
                state.stats.averageLoadTime =
                  (state.stats.averageLoadTime * (totalCompleted - 1) + payload.loadTime) /
                  totalCompleted;
              }
            }
            break;

          case 'increment_total':
            state.stats.totalOperations++;
            break;
        }
      });

      state.stats.lastUpdate = Date.now();
    },

    // Bulk operations
    clearCompletedOperations: state => {
      Object.keys(state.operations).forEach(id => {
        const operation = state.operations[id];
        if (operation && !operation.error && !operation.cancelled) {
          delete state.operations[id];
        }
      });
    },

    clearFailedOperations: state => {
      Object.keys(state.operations).forEach(id => {
        const operation = state.operations[id];
        if (operation && operation.error) {
          delete state.operations[id];
        }
      });
    },

    resetLoadingState: state => {
      // Keep connection info and adaptive settings
      const { connectionInfo, isOnline, adaptiveSettings } = state;

      return {
        ...initialState,
        connectionInfo,
        isOnline,
        adaptiveSettings,
      };
    },
  },
  extraReducers: builder => {
    // Start operation
    builder
      .addCase(startLoadingOperation.fulfilled, (state, action) => {
        const operationId = action.payload.id;

        // Check if operation already exists to prevent race conditions
        if (state.operations[operationId]) {
          logger.warn('Operation already exists, skipping creation', {
            component: 'LoadingSlice',
            operationId,
          });
          return;
        }

        // Initialize full LoadingOperation with defaults, then merge payload
        // We first create the defaults object, then spread both
        const defaults: Partial<MutableLoadingOperation> = {
          priority: 'medium',
          retryStrategy: 'exponential',
          retryDelay: 1000,
          connectionAware: true,
          startTime: Date.now(),
          retryCount: 0,
          timeoutWarningShown: false,
          cancelled: false,
          state: 'loading',
        };

        // Merge defaults with payload, payload takes precedence
        const operation: MutableLoadingOperation = {
          ...defaults,
          ...action.payload,
        } as MutableLoadingOperation;

        // Ensure dependencies is mutable array if present
        if (action.payload.dependencies) {
           operation.dependencies = [...action.payload.dependencies];
        }

        state.operations[operationId] = operation;

        // Update stats
        state.stats.totalOperations++;
        state.stats.activeOperations = Object.keys(state.operations).length;

        // Update global loading states
        state.globalLoading = state.stats.activeOperations > 0;
        state.highPriorityLoading = Object.values(state.operations).some(
          op => op.priority === 'high'
        );

        state.stats.lastUpdate = Date.now();
      })
      .addCase(startLoadingOperation.rejected, (_, action) => {
        logger.error('Failed to start loading operation', {
          component: 'LoadingSlice',
          error: action.payload,
        });
      });

    // Complete operation
    builder.addCase(completeLoadingOperation.fulfilled, (state, action) => {
      const { id, success, error } = action.payload;
      const operation = state.operations[id];

      if (operation) {
        const loadTime = Date.now() - operation.startTime;

        if (success) {
          // Update stats atomically
          state.stats.completedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );

          // Update average load time
          const totalCompleted = state.stats.completedOperations;
          if (totalCompleted > 0) {
            state.stats.averageLoadTime =
              (state.stats.averageLoadTime * (totalCompleted - 1) + loadTime) / totalCompleted;
          }
        } else {
          operation.error = error;
          state.stats.failedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );
        }

        // Remove completed operation
        delete state.operations[id];
        state.stats.activeOperations = Object.keys(state.operations).length;

        // Update global loading states
        state.globalLoading = state.stats.activeOperations > 0;
        state.highPriorityLoading = Object.values(state.operations).some(
          op => op.priority === 'high'
        );

        state.stats.lastUpdate = Date.now();
      }
    });

    // Retry operation
    builder
      .addCase(retryLoadingOperation.fulfilled, (state, action) => {
        const { id } = action.payload;
        if (state.operations[id]) {
          state.operations[id].retryCount++;
          state.stats.retryRate =
            (state.stats.retryRate * state.stats.totalOperations + 1) /
            (state.stats.totalOperations + 1);
          state.stats.lastUpdate = Date.now();
        }
      })
      .addCase(retryLoadingOperation.rejected, (_, action) => {
        logger.error('Failed to retry loading operation', {
          component: 'LoadingSlice',
          error: action.payload,
        });
      });

    // Timeout operation
    builder.addCase(timeoutLoadingOperation.fulfilled, (state, action) => {
      const { id, error } = action.payload;
      if (state.operations[id]) {
        state.operations[id].error = error;
        state.stats.failedOperations++;

        // Remove timed out operation
        delete state.operations[id];
        state.stats.activeOperations = Object.keys(state.operations).length;

        // Update global loading states
        state.globalLoading = state.stats.activeOperations > 0;
        state.highPriorityLoading = Object.values(state.operations).some(
          op => op.priority === 'high'
        );

        state.stats.lastUpdate = Date.now();
      }
    });
  },
});

// Export actions
export const {
  updateConnectionInfo,
  setOnlineStatus,
  updateAdaptiveSettings,
  updateAssetProgress,
  updateOperation,
  cancelOperation,
  showTimeoutWarning,
  setGlobalLoading,
  setHighPriorityLoading,
  updateStats,
  updateStatsAtomic,
  batchStatsUpdate,
  clearCompletedOperations,
  clearFailedOperations,
  resetLoadingState,
} = loadingSlice.actions;

// Selectors
export const selectLoadingOperation = (state: { loading: LoadingStateData }, id: string) =>
  state.loading.operations[id];

export const selectOperationsByType = (state: { loading: LoadingStateData }, type: LoadingType) =>
  Object.values(state.loading.operations).filter(op => op.type === type);

export const selectOperationsByPriority = (
  state: { loading: LoadingStateData },
  priority: LoadingPriority
) => Object.values(state.loading.operations).filter(op => op.priority === priority);

export const selectActiveOperationsCount = (state: { loading: LoadingStateData }) =>
  Object.keys(state.loading.operations).length;

export const selectShouldShowGlobalLoader = (state: { loading: LoadingStateData }) =>
  state.loading.highPriorityLoading ||
  (state.loading.globalLoading && selectActiveOperationsCount(state) > 2);

export const selectEstimatedTimeRemaining = (state: { loading: LoadingStateData }, id: string) => {
  const operation = state.loading.operations[id];
  if (!operation) return null;

  const elapsed = Date.now() - operation.startTime;
  const timeout = operation.timeout || state.loading.adaptiveSettings.defaultTimeout;
  const remaining = timeout - elapsed;

  return remaining > 0 ? remaining : null;
};

export const selectLoadingStats = (state: { loading: LoadingStateData }) => state.loading.stats;

export const selectConnectionInfo = (state: { loading: LoadingStateData }) =>
  state.loading.connectionInfo;

export const selectAdaptiveSettings = (state: { loading: LoadingStateData }) =>
  state.loading.adaptiveSettings;

export const selectAssetLoadingProgress = (state: { loading: LoadingStateData }) =>
  state.loading.assetLoadingProgress;

// Type exports
export type {
  LoadingStateData,
  ConnectionInfo,
  AdaptiveSettings,
  AssetLoadingProgress,
  ExtendedLoadingStats,
  StatsUpdate,
  StatsUpdateType,
};

export { loadingSlice };
export default loadingSlice.reducer;
