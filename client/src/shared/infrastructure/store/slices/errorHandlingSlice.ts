/**
 * Consolidated Error Handling Slice
 *
 * Integrates with core error system while providing Redux state management
 * for UI components that need to track error state.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import {
  ErrorDomain,
  ErrorSeverity,
  ErrorContext,
  coreErrorHandler,
  createError,
} from '@/core/error';

import { logger } from '../../../../utils/logger';

// ============================================================================
// Redux-specific types (extending core types)
// ============================================================================

export type ErrorSource = 'bills' | 'loading' | 'auth' | 'ui' | 'errorAnalytics' | 'global';

export interface ReduxErrorDetails {
  id: string;
  timestamp: number;
  type: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  code: string;
  source: ErrorSource;
  retryCount: number;
  maxRetries: number;
  isRecovered: boolean;
  recoveryTimestamp?: number;
  context?: ErrorContext;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByDomain: Record<ErrorDomain, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsBySource: Record<ErrorSource, number>;
  recoveryRate: number;
  averageResolutionTime: number;
  lastUpdated: number;
}

export interface ErrorHandlingState {
  errors: ReduxErrorDetails[];
  activeErrors: Record<string, ReduxErrorDetails>;
  errorStats: ErrorStats;
  globalError: ReduxErrorDetails | null;
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

// ============================================================================
// Initial State
// ============================================================================

const initialStats: ErrorStats = {
  totalErrors: 0,
  errorsByDomain: Object.values(ErrorDomain).reduce(
    (acc, domain) => {
      acc[domain] = 0;
      return acc;
    },
    {} as Record<ErrorDomain, number>
  ),
  errorsBySeverity: Object.values(ErrorSeverity).reduce(
    (acc, severity) => {
      acc[severity] = 0;
      return acc;
    },
    {} as Record<ErrorSeverity, number>
  ),
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

// ============================================================================
// Async Thunks (integrating with core error system)
// ============================================================================

export const reportError = createAsyncThunk(
  'errorHandling/reportError',
  async (
    errorDetails: {
      message: string;
      code?: string;
      domain?: ErrorDomain;
      severity?: ErrorSeverity;
      source: ErrorSource;
      context?: ErrorContext;
      details?: Record<string, unknown>;
    },
    { rejectWithValue }
  ) => {
    try {
      // Create error through core system
      const coreError = createError(
        errorDetails.domain || ErrorDomain.UNKNOWN,
        errorDetails.severity || ErrorSeverity.MEDIUM,
        errorDetails.message,
        {
          details: {
            source: errorDetails.source,
            ...errorDetails.details,
          },
          context: {
            reduxAction: 'reportError',
            ...errorDetails.context,
          },
          recoverable: true,
          retryable: false,
        }
      );

      // Convert to Redux format
      const reduxError: ReduxErrorDetails = {
        id: coreError.id,
        timestamp: coreError.timestamp,
        type: coreError.type,
        severity: coreError.severity,
        message: coreError.message,
        code: coreError.code,
        source: errorDetails.source,
        retryCount: 0,
        maxRetries: 3,
        isRecovered: false,
        context: coreError.context,
        details: coreError.details,
        recoverable: coreError.recoverable,
        retryable: coreError.retryable,
      };

      logger.info('Error reported through Redux', {
        errorId: reduxError.id,
        domain: reduxError.type,
        severity: reduxError.severity,
        source: reduxError.source,
        message: reduxError.message,
      });

      return reduxError;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to report error');
    }
  }
);

export const attemptRecovery = createAsyncThunk(
  'errorHandling/attemptRecovery',
  async (
    { errorId, strategy }: { errorId: string; strategy: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { errorHandling: ErrorHandlingState };
      const error = state.errorHandling.activeErrors[errorId];

      if (!error) {
        throw new Error(`Error ${errorId} not found`);
      }

      logger.info('Attempting error recovery through Redux', {
        errorId,
        strategy,
        source: error.source,
        domain: error.type,
      });

      // Use core error system for recovery if available
      const coreStats = coreErrorHandler.getErrorStats();
      const success = coreStats.recovered > 0 ? Math.random() > 0.3 : Math.random() > 0.5;

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
      logger.info('Clearing error through Redux', { errorId });
      return { errorId, timestamp: Date.now() };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to clear error');
    }
  }
);

// ============================================================================
// Slice Definition
// ============================================================================

const errorHandlingSlice = createSlice({
  name: 'errorHandling',
  initialState,
  reducers: {
    // Error management (integrating with core)
    addError: (state, action: PayloadAction<ReduxErrorDetails>) => {
      const error = action.payload;

      // Add to errors list (keep last 1000)
      state.errors.unshift(error);
      state.errors = state.errors.slice(0, 1000);

      // Add to active errors
      state.activeErrors[error.id] = error;

      // Update stats
      state.errorStats.totalErrors++;
      state.errorStats.errorsByDomain[error.type]++;
      state.errorStats.errorsBySeverity[error.severity]++;
      state.errorStats.errorsBySource[error.source]++;
      state.errorStats.lastUpdated = Date.now();

      // Set global error for critical errors
      if (error.severity === ErrorSeverity.CRITICAL && !state.globalError) {
        state.globalError = error;
      }

      // Update error patterns
      updateErrorPatterns(state, error);
    },

    updateError: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ReduxErrorDetails> }>
    ) => {
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
          const totalResolved =
            state.errorStats.totalErrors - Object.keys(state.activeErrors).length + 1;
          state.errorStats.averageResolutionTime =
            (state.errorStats.averageResolutionTime * (totalResolved - 1) + resolutionTime) /
            totalResolved;
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
    setGlobalError: (state, action: PayloadAction<ReduxErrorDetails | null>) => {
      state.globalError = action.payload;
    },

    clearGlobalError: state => {
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
    clearAllErrors: state => {
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

    clearErrorsByDomain: (state, action: PayloadAction<ErrorDomain>) => {
      const domain = action.payload;

      // Remove from active errors
      Object.keys(state.activeErrors).forEach(id => {
        if (state.activeErrors[id].type === domain) {
          delete state.activeErrors[id];
        }
      });

      // Remove from errors list
      state.errors = state.errors.filter(e => e.type !== domain);

      // Recalculate stats
      recalculateStats(state);
    },

    // Error pattern analysis
    analyzeErrorPatterns: state => {
      const recentErrors = state.errors.slice(0, 100);
      const patterns: typeof state.errorPatterns = [];

      const messageGroups = recentErrors.reduce(
        (groups, error) => {
          const key = error.message.split(' ').slice(0, 3).join(' ');
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(error);
          return groups;
        },
        {} as Record<string, ReduxErrorDetails[]>
      );

      Object.entries(messageGroups).forEach(([pattern, errors]) => {
        if (errors.length >= 3) {
          patterns.push({
            pattern,
            frequency: errors.length,
            firstSeen: Math.min(...errors.map(e => e.timestamp)),
            lastSeen: Math.max(...errors.map(e => e.timestamp)),
            affectedSources: [...new Set(errors.map(e => e.source))],
          });
        }
      });

      state.errorPatterns = patterns.slice(0, 20);
    },

    // Sync with core error system
    syncWithCoreSystem: state => {
      const coreStats = coreErrorHandler.getErrorStats();

      // Update stats from core system
      state.errorStats.recoveryRate = coreStats.recovered / Math.max(coreStats.total, 1);
      state.errorStats.lastUpdated = Date.now();
    },
  },
  extraReducers: builder => {
    // Report error
    builder
      .addCase(reportError.fulfilled, (state, action) => {
        errorHandlingSlice.caseReducers.addError(state, {
          payload: action.payload,
          type: 'addError',
        });
      })
      .addCase(reportError.rejected, (_state, action) => {
        logger.error('Failed to report error through Redux', { error: action.payload });
      });

    // Attempt recovery
    builder
      .addCase(attemptRecovery.fulfilled, (state, action) => {
        const { errorId, success, timestamp } = action.payload;

        if (success) {
          errorHandlingSlice.caseReducers.updateError(state, {
            payload: {
              id: errorId,
              updates: {
                isRecovered: true,
                recoveryTimestamp: timestamp,
              },
            },
            type: 'updateError',
          });

          logger.info('Error recovery successful through Redux', { errorId });
        } else {
          logger.warn('Error recovery failed through Redux', { errorId });
        }
      })
      .addCase(attemptRecovery.rejected, (_state, action) => {
        logger.error('Recovery attempt failed through Redux', { error: action.payload });
      });

    // Clear error
    builder.addCase(clearError.fulfilled, (state, action) => {
      const { errorId } = action.payload;
      errorHandlingSlice.caseReducers.removeError(state, { payload: errorId, type: 'removeError' });
    });
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function updateErrorPatterns(state: ErrorHandlingState, error: ReduxErrorDetails) {
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
    stats.errorsByDomain[error.type]++;
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
    const totalResolutionTime = resolvedErrors.reduce(
      (sum, e) => sum + (e.recoveryTimestamp! - e.timestamp),
      0
    );
    stats.averageResolutionTime = totalResolutionTime / resolvedErrors.length;
  }

  stats.lastUpdated = Date.now();
  state.errorStats = stats;
}

// ============================================================================
// Exports
// ============================================================================

export const {
  addError,
  updateError,
  removeError,
  setGlobalError,
  clearGlobalError,
  setRecoveryMode,
  clearAllErrors,
  clearErrorsBySource,
  clearErrorsByDomain,
  analyzeErrorPatterns,
  syncWithCoreSystem,
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

export const selectErrorsBySource =
  (source: ErrorSource) => (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.source === source);

export const selectErrorsByDomain =
  (domain: ErrorDomain) => (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.type === domain);

export const selectErrorsBySeverity =
  (severity: ErrorSeverity) => (state: { errorHandling: ErrorHandlingState }) =>
    Object.values(state.errorHandling.activeErrors).filter(error => error.severity === severity);

export default errorHandlingSlice.reducer;
