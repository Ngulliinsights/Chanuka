/**
 * Consolidated Error Handling Slice
 *
 * Unified error handling across all slices with consistent patterns,
 * error classification, recovery strategies, and analytics integration.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { logger } from '@client/utils/logger';

// Error classification types
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'api' | 'validation' | 'authentication' | 'authorization' | 'data' | 'ui' | 'system' | 'unknown';
export type ErrorSource = 'bills' | 'loading' | 'auth' | 'ui' | 'errorAnalytics' | 'global';

export interface ErrorDetails {
  id: string;
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  source: ErrorSource;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  retryCount?: number;
  maxRetries?: number;
  recoveryStrategies?: string[];
  isRecovered?: boolean;
  recoveryTimestamp?: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsBySource: Record<ErrorSource, number>;
  recoveryRate: number;
  averageResolutionTime: number;
  lastUpdated: number;
}

export interface ErrorHandlingState {
  errors: ErrorDetails[];
  activeErrors: Record<string, ErrorDetails>;
  errorStats: ErrorStats;
  globalError: ErrorDetails | null;
  isRecoveryMode: boolean;
  recoveryAttempts: number;
  lastRecoveryAttempt: number | null;
  errorPatterns: Array<{
    pattern: string;
    frequency: number;
    firstSeen: number;
    lastSeen: number;
    affectedSources: ErrorSource[];
  }>;
}

const initialStats: ErrorStats = {
  totalErrors: 0,
  errorsByCategory: {
    network: 0,
    api: 0,
    validation: 0,
    authentication: 0,
    authorization: 0,
    data: 0,
    ui: 0,
    system: 0,
    unknown: 0,
  },
  errorsBySeverity: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  },
  errorsBySource: {
    bills: 0,
    loading: 0,
    auth: 0,
    ui: 0,
    errorAnalytics: 0,
    global: 0,
  },
  recoveryRate: 0,
  averageResolutionTime: 0,
  lastUpdated: Date.now(),
};

const initialState: ErrorHandlingState = {
  errors: [],
  activeErrors: {},
  errorStats: initialStats,
  globalError: null,
  isRecoveryMode: false,
  recoveryAttempts: 0,
  lastRecoveryAttempt: null,
  errorPatterns: [],
};

// Async thunks for error operations
export const reportError = createAsyncThunk(
  'errorHandling/reportError',
  async (errorDetails: Omit<ErrorDetails, 'id' | 'timestamp'>, { rejectWithValue }) => {
    try {
      const error: ErrorDetails = {
        ...errorDetails,
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      // Log error with appropriate level
      const logLevel = error.severity === 'critical' ? 'error' :
                      error.severity === 'high' ? 'warn' : 'info';

      logger[logLevel]('Error reported', {
        errorId: error.id,
        category: error.category,
        severity: error.severity,
        source: error.source,
        message: error.message,
        context: error.context,
      });

      return error;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to report error');
    }
  }
);

export const attemptRecovery = createAsyncThunk(
  'errorHandling/attemptRecovery',
  async ({ errorId, strategy }: { errorId: string; strategy: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { errorHandling: ErrorHandlingState };
      const error = state.errorHandling.activeErrors[errorId];

      if (!error) {
        throw new Error(`Error ${errorId} not found`);
      }

      logger.info('Attempting error recovery', {
        errorId,
        strategy,
        source: error.source,
        category: error.category,
      });

      // Simulate recovery attempt - in real implementation, this would
      // execute the specific recovery strategy
      const success = Math.random() > 0.3; // 70% success rate for demo

      return {
        errorId,
        strategy,
        success,
        timestamp: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Recovery attempt failed');
    }
  }
);

export const clearError = createAsyncThunk(
  'errorHandling/clearError',
  async (errorId: string, { rejectWithValue }) => {
    try {
      logger.info('Clearing error', { errorId });
      return { errorId, timestamp: Date.now() };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to clear error');
    }
  }
);

const errorHandlingSlice = createSlice({
  name: 'errorHandling',
  initialState,
  reducers: {
    // Error management
    addError: (state, action: PayloadAction<ErrorDetails>) => {
      const error = action.payload;

      // Add to errors list (keep last 1000)
      state.errors.unshift(error);
      state.errors = state.errors.slice(0, 1000);

      // Add to active errors
      state.activeErrors[error.id] = error;

      // Update stats
      state.errorStats.totalErrors++;
      state.errorStats.errorsByCategory[error.category]++;
      state.errorStats.errorsBySeverity[error.severity]++;
      state.errorStats.errorsBySource[error.source]++;
      state.errorStats.lastUpdated = Date.now();

      // Set global error for critical errors
      if (error.severity === 'critical' && !state.globalError) {
        state.globalError = error;
      }

      // Update error patterns
      updateErrorPatterns(state, error);
    },

    updateError: (state, action: PayloadAction<{ id: string; updates: Partial<ErrorDetails> }>) => {
      const { id, updates } = action.payload;
      if (state.activeErrors[id]) {
        state.activeErrors[id] = { ...state.activeErrors[id], ...updates };
      }

      // Update in errors list
      const index = state.errors.findIndex(e => e.id === id);
      if (index !== -1) {
        state.errors[index] = { ...state.errors[index], ...updates };
      }
    },

    removeError: (state, action: PayloadAction<string>) => {
      const errorId = action.payload;
      const error = state.activeErrors[errorId];

      if (error) {
        // Update stats on removal
        if (error.isRecovered) {
          const resolutionTime = error.recoveryTimestamp! - error.timestamp;
          const totalResolved = state.errorStats.totalErrors - Object.keys(state.activeErrors).length + 1;
          state.errorStats.averageResolutionTime =
            (state.errorStats.averageResolutionTime * (totalResolved - 1) + resolutionTime) / totalResolved;
          state.errorStats.recoveryRate = totalResolved / state.errorStats.totalErrors;
        }

        // Remove from active errors
        delete state.activeErrors[errorId];

        // Clear global error if it was this error
        if (state.globalError?.id === errorId) {
          state.globalError = null;
        }
      }
    },

    // Global error management
    setGlobalError: (state, action: PayloadAction<ErrorDetails | null>) => {
      state.globalError = action.payload;
    },

    clearGlobalError: (state) => {
      state.globalError = null;
    },

    // Recovery mode
    setRecoveryMode: (state, action: PayloadAction<boolean>) => {
      state.isRecoveryMode = action.payload;
      if (action.payload) {
        state.recoveryAttempts++;
        state.lastRecoveryAttempt = Date.now();
      }
    },

    // Bulk operations
    clearAllErrors: (state) => {
      state.errors = [];
      state.activeErrors = {};
      state.globalError = null;
      state.errorStats = { ...initialStats, lastUpdated: Date.now() };
    },

    clearErrorsBySource: (state, action: PayloadAction<ErrorSource>) => {
      const source = action.payload;

      // Remove from active errors
      Object.keys(state.activeErrors).forEach(id => {
        if (state.activeErrors[id].source === source) {
          delete state.activeErrors[id];
        }
      });

      // Remove from errors list
      state.errors = state.errors.filter(e => e.source !== source);

      // Recalculate stats
      recalculateStats(state);
    },

    clearErrorsByCategory: (state, action: PayloadAction<ErrorCategory>) => {
      const category = action.payload;

      // Remove from active errors
      Object.keys(state.activeErrors).forEach(id => {
        if (state.activeErrors[id].category === category) {
          delete state.activeErrors[id];
        }
      });

      // Remove from errors list
      state.errors = state.errors.filter(e => e.category !== category);

      // Recalculate stats
      recalculateStats(state);
    },

    // Error pattern analysis
    analyzeErrorPatterns: (state) => {
      // Analyze recent errors for patterns
      const recentErrors = state.errors.slice(0, 100); // Last 100 errors
      const patterns: typeof state.errorPatterns = [];

      // Simple pattern detection based on error messages
      const messageGroups = recentErrors.reduce((groups, error) => {
        const key = error.message.split(' ').slice(0, 3).join(' '); // First 3 words
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(error);
        return groups;
      }, {} as Record<string, ErrorDetails[]>);

      Object.entries(messageGroups).forEach(([pattern, errors]) => {
        if (errors.length >= 3) { // Pattern threshold
          patterns.push({
            pattern,
            frequency: errors.length,
            firstSeen: Math.min(...errors.map(e => e.timestamp)),
            lastSeen: Math.max(...errors.map(e => e.timestamp)),
            affectedSources: [...new Set(errors.map(e => e.source))],
          });
        }
      });

      state.errorPatterns = patterns.slice(0, 20); // Keep top 20 patterns
    },
  },
  extraReducers: (builder) => {
    // Report error
    builder
      .addCase(reportError.fulfilled, (state, action) => {
        errorHandlingSlice.caseReducers.addError(state, { payload: action.payload, type: 'addError' });
      })
      .addCase(reportError.rejected, (state, action) => {
        logger.error('Failed to report error', { error: action.payload });
      });

    // Attempt recovery
    builder
      .addCase(attemptRecovery.fulfilled, (state, action) => {
        const { errorId, success, timestamp } = action.payload;

        if (success) {
          // Mark error as recovered
          errorHandlingSlice.caseReducers.updateError(state, {
            payload: {
              id: errorId,
              updates: {
                isRecovered: true,
                recoveryTimestamp: timestamp,
              }
            },
            type: 'updateError'
          });

          logger.info('Error recovery successful', { errorId });
        } else {
          logger.warn('Error recovery failed', { errorId });
        }
      })
      .addCase(attemptRecovery.rejected, (state, action) => {
        logger.error('Recovery attempt failed', { error: action.payload });
      });

    // Clear error
    builder
      .addCase(clearError.fulfilled, (state, action) => {
        const { errorId } = action.payload;
        errorHandlingSlice.caseReducers.removeError(state, { payload: errorId, type: 'removeError' });
      });
  },
});

// Helper functions
function updateErrorPatterns(state: ErrorHandlingState, error: ErrorDetails) {
  // Simple pattern detection - in a real implementation, this would use
  // more sophisticated pattern recognition algorithms
  const pattern = error.message.split(' ').slice(0, 3).join(' ');
  const existingPattern = state.errorPatterns.find(p => p.pattern === pattern);

  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastSeen = error.timestamp;
    if (!existingPattern.affectedSources.includes(error.source)) {
      existingPattern.affectedSources.push(error.source);
    }
  } else if (state.errorPatterns.length < 20) {
    state.errorPatterns.push({
      pattern,
      frequency: 1,
      firstSeen: error.timestamp,
      lastSeen: error.timestamp,
      affectedSources: [error.source],
    });
  }
}

function recalculateStats(state: ErrorHandlingState) {
  const stats = { ...initialStats };

  Object.values(state.activeErrors).forEach(error => {
    stats.totalErrors++;
    stats.errorsByCategory[error.category]++;
    stats.errorsBySeverity[error.severity]++;
    stats.errorsBySource[error.source]++;
  });

  // Calculate recovery rate
  const totalErrors = state.errors.length;
  const recoveredErrors = state.errors.filter(e => e.isRecovered).length;
  stats.recoveryRate = totalErrors > 0 ? recoveredErrors / totalErrors : 0;

  // Calculate average resolution time
  const resolvedErrors = state.errors.filter(e => e.isRecovered && e.recoveryTimestamp);
  if (resolvedErrors.length > 0) {
    const totalResolutionTime = resolvedErrors.reduce((sum, e) =>
      sum + (e.recoveryTimestamp! - e.timestamp), 0);
    stats.averageResolutionTime = totalResolutionTime / resolvedErrors.length;
  }

  stats.lastUpdated = Date.now();
  state.errorStats = stats;
}

// Export actions
export const {
  addError,
  updateError,
  removeError,
  setGlobalError,
  clearGlobalError,
  setRecoveryMode,
  clearAllErrors,
  clearErrorsBySource,
  clearErrorsByCategory,
  analyzeErrorPatterns,
} = errorHandlingSlice.actions;

// Selectors
export const selectErrors = (state: { errorHandling: ErrorHandlingState }) =>
  state.errorHandling.errors;

export const selectActiveErrors = (state: { errorHandling: ErrorHandlingState }) =>
  Object.values(state.errorHandling.activeErrors);

export const selectGlobalError = (state: { errorHandling: ErrorHandlingState }) =>
  state.errorHandling.globalError;

export const selectErrorStats = (state: { errorHandling: ErrorHandlingState }) =>
  state.errorHandling.errorStats;

export const selectErrorPatterns = (state: { errorHandling: ErrorHandlingState }) =>
  state.errorHandling.errorPatterns;

export const selectIsRecoveryMode = (state: { errorHandling: ErrorHandlingState }) =>
  state.errorHandling.isRecoveryMode;

export const selectErrorsBySource = (source: ErrorSource) =>
  (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.source === source);

export const selectErrorsByCategory = (category: ErrorCategory) =>
  (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.category === category);

export const selectErrorsBySeverity = (severity: ErrorSeverity) =>
  (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.severity === severity);

export default errorHandlingSlice.reducer;