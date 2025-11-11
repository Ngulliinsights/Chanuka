/**
 * Loading State Management with Redux Toolkit
 *
 * Unified loading state management with connection awareness, timeout handling,
 * and integration with the core loading context system.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LoadingStateData, LoadingOperation, LoadingAction, ConnectionInfo, AdaptiveSettings, AssetLoadingProgress, LoadingStats, LoadingType, LoadingPriority, RetryStrategy } from '../../core/loading/types';
import { logger } from '../../utils/logger';

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

// Async thunks for loading operations
export const startLoadingOperation = createAsyncThunk(
    'loading/startOperation',
    async (operation: Omit<LoadingOperation, 'startTime' | 'retryCount' | 'timeoutWarningShown' | 'cancelled'>, { rejectWithValue }) => {
        try {
            // Validate operation
            if (!operation.id || !operation.type) {
                throw new Error('Invalid operation: missing id or type');
            }

            // Check concurrent operation limits
            // This would be handled by the loading context, but we can add basic validation here

            return operation;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to start operation');
        }
    }
);

export const completeLoadingOperation = createAsyncThunk(
    'loading/completeOperation',
    async ({ id, success, error }: { id: string; success: boolean; error?: Error }, { rejectWithValue }) => {
        try {
            return { id, success, error: error?.message };
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to complete operation');
        }
    }
);

export const retryLoadingOperation = createAsyncThunk(
    'loading/retryOperation',
    async (id: string, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { loading: LoadingStateData };
            const operation = state.loading.operations[id];

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
            const state = getState() as { loading: LoadingStateData };
            const operation = state.loading.operations[id];

            if (!operation) {
                throw new Error(`Operation ${id} not found`);
            }

            const timeoutError = new Error(`Operation timed out after ${operation.timeout || state.loading.adaptiveSettings.defaultTimeout}ms`);
            return { id, error: timeoutError.message };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to timeout operation');
        }
    }
);

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

            state.stats.connectionImpact = action.payload.type === 'offline' ? 'high' :
                                         action.payload.type === 'slow' ? 'medium' : 'low';
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
        updateOperation: (state, action: PayloadAction<{ id: string; updates: Partial<LoadingOperation> }>) => {
            const { id, updates } = action.payload;
            if (state.operations[id]) {
                state.operations[id] = { ...state.operations[id], ...updates };
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
        updateStats: (state, action: PayloadAction<Partial<LoadingStats>>) => {
            state.stats = { ...state.stats, ...action.payload };
        },

        // Bulk operations
        clearCompletedOperations: (state) => {
            Object.keys(state.operations).forEach(id => {
                const operation = state.operations[id];
                if (operation && !operation.error && !operation.cancelled) {
                    delete state.operations[id];
                }
            });
        },

        clearFailedOperations: (state) => {
            Object.keys(state.operations).forEach(id => {
                const operation = state.operations[id];
                if (operation && operation.error) {
                    delete state.operations[id];
                }
            });
        },

        resetLoadingState: (state) => {
            // Keep connection info and adaptive settings
            const connectionInfo = state.connectionInfo;
            const isOnline = state.isOnline;
            const adaptiveSettings = state.adaptiveSettings;

            return {
                ...initialState,
                connectionInfo,
                isOnline,
                adaptiveSettings,
            };
        },
    },
    extraReducers: (builder) => {
        // Start operation
        builder
            .addCase(startLoadingOperation.fulfilled, (state, action) => {
                const operation: LoadingOperation = {
                    ...action.payload,
                    startTime: Date.now(),
                    retryCount: 0,
                    timeoutWarningShown: false,
                    cancelled: false,
                };

                state.operations[action.payload.id] = operation;
                state.stats.totalOperations++;
                state.stats.activeOperations = Object.keys(state.operations).length;

                // Update global loading states
                state.globalLoading = state.stats.activeOperations > 0;
                state.highPriorityLoading = Object.values(state.operations).some(op => op.priority === 'high');

                state.stats.lastUpdate = Date.now();
            })
            .addCase(startLoadingOperation.rejected, (state, action) => {
                logger.error('Failed to start loading operation', {
                    component: 'LoadingSlice',
                    error: action.payload
                });
            });

        // Complete operation
        builder
            .addCase(completeLoadingOperation.fulfilled, (state, action) => {
                const { id, success, error } = action.payload;
                const operation = state.operations[id];

                if (operation) {
                    if (success) {
                        state.stats.completedOperations++;
                        // Calculate average load time
                        const loadTime = Date.now() - operation.startTime;
                        const totalCompleted = state.stats.completedOperations;
                        state.stats.averageLoadTime =
                            (state.stats.averageLoadTime * (totalCompleted - 1) + loadTime) / totalCompleted;
                    } else {
                        state.stats.failedOperations++;
                        operation.error = new Error(error);
                    }

                    // Remove completed operation
                    delete state.operations[id];
                    state.stats.activeOperations = Object.keys(state.operations).length;

                    // Update global loading states
                    state.globalLoading = state.stats.activeOperations > 0;
                    state.highPriorityLoading = Object.values(state.operations).some(op => op.priority === 'high');

                    state.stats.lastUpdate = Date.now();
                }
            });

        // Retry operation
        builder
            .addCase(retryLoadingOperation.fulfilled, (state, action) => {
                const { id } = action.payload;
                if (state.operations[id]) {
                    state.operations[id].retryCount++;
                    state.stats.retryRate = (state.stats.retryRate * state.stats.totalOperations + 1) / (state.stats.totalOperations + 1);
                    state.stats.lastUpdate = Date.now();
                }
            })
            .addCase(retryLoadingOperation.rejected, (state, action) => {
                logger.error('Failed to retry loading operation', {
                    component: 'LoadingSlice',
                    error: action.payload
                });
            });

        // Timeout operation
        builder
            .addCase(timeoutLoadingOperation.fulfilled, (state, action) => {
                const { id, error } = action.payload;
                if (state.operations[id]) {
                    state.operations[id].error = new Error(error);
                    state.stats.failedOperations++;

                    // Remove timed out operation
                    delete state.operations[id];
                    state.stats.activeOperations = Object.keys(state.operations).length;

                    // Update global loading states
                    state.globalLoading = state.stats.activeOperations > 0;
                    state.highPriorityLoading = Object.values(state.operations).some(op => op.priority === 'high');

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
    clearCompletedOperations,
    clearFailedOperations,
    resetLoadingState,
} = loadingSlice.actions;

// Selectors
export const selectLoadingOperation = (state: { loading: LoadingStateData }, id: string) =>
    state.loading.operations[id];

export const selectOperationsByType = (state: { loading: LoadingStateData }, type: LoadingType) =>
    Object.values(state.loading.operations).filter(op => op.type === type);

export const selectOperationsByPriority = (state: { loading: LoadingStateData }, priority: LoadingPriority) =>
    Object.values(state.loading.operations).filter(op => op.priority === priority);

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

export const selectLoadingStats = (state: { loading: LoadingStateData }) =>
    state.loading.stats;

export const selectConnectionInfo = (state: { loading: LoadingStateData }) =>
    state.loading.connectionInfo;

export const selectAdaptiveSettings = (state: { loading: LoadingStateData }) =>
    state.loading.adaptiveSettings;

export default loadingSlice.reducer;