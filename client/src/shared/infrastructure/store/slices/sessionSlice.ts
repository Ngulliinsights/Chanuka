/**
 * Session Slice - Optimized Version
 *
 * Manages user session state and session management with backend integration.
 * Optimized for performance, type safety, and security best practices.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import { logger } from '@client/shared/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

// Define SessionInfo interface since it's not available in the auth module
export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  current: boolean;
}

export interface SessionConfig {
  maxIdleTime: number; // milliseconds
  warningTime: number; // milliseconds before expiry warning
  checkInterval: number; // milliseconds between checks
  enableActivityTracking: boolean;
  enableSecurityMonitoring: boolean;
}

export type ActivityType = 'mouse' | 'keyboard' | 'touch' | 'api' | 'navigation';

export interface SessionActivity {
  timestamp: number;
  type: ActivityType;
  details?: Record<string, unknown>;
}

export type WarningType = 'idle_warning' | 'security_alert' | 'concurrent_session';
export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SessionWarning {
  type: WarningType;
  message: string;
  timeRemaining?: number;
  severity: WarningSeverity;
  timestamp: number; // Added for better tracking
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  deviceFingerprint: string;
  ipAddress: string;
}

export interface SessionState {
  // Core session state
  currentSession: SessionInfo | null;
  activeSessions: SessionInfo[];
  sessionData: SessionData | null;

  // Session management
  isActive: boolean;
  sessionId: string | null;
  lastActivity: number;
  config: SessionConfig;

  // Activity tracking
  activityLog: SessionActivity[];

  // Monitoring - Removed interval references to prevent serialization issues
  lastErrorLog: number;

  // Warnings
  warnings: SessionWarning[];

  // Async state
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const SESSION_STORAGE_KEY = 'chanuka_session_data' as const;
const SESSION_COOKIE_NAME = 'session_id' as const;
const CSRF_COOKIE_NAME = 'csrf_token' as const;
const CSRF_META_NAME = 'csrf-token' as const;
const MAX_ACTIVITY_LOG_SIZE = 100;
const MAX_WARNINGS = 10;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const defaultConfig: SessionConfig = {
  maxIdleTime: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000, // 5 minutes
  checkInterval: 60 * 1000, // 1 minute
  enableActivityTracking: true,
  enableSecurityMonitoring: true,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Securely generates a CSRF token using the Web Crypto API
 */
const generateCsrfToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Sets a secure cookie with proper attributes
 */
const setSecureCookie = (name: string, value: string, maxAge: number): void => {
  if (typeof document === 'undefined') return;

  const cookieString = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'Secure',
    'SameSite=Strict', // Added for CSRF protection
    `Max-Age=${maxAge}`,
  ].join('; ');

  document.cookie = cookieString;
};

/**
 * Clears a cookie by setting its expiry to the past
 */
const clearCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict`;
};

/**
 * Sets CSRF token in both cookie and meta tag
 */
const setCsrfToken = (token: string): void => {
  if (typeof document === 'undefined') return;

  // Set cookie
  setSecureCookie(CSRF_COOKIE_NAME, token, SESSION_MAX_AGE_MS / 1000);

  // Set meta tag for easier access by JavaScript
  let metaTag = document.querySelector(`meta[name="${CSRF_META_NAME}"]`) as HTMLMetaElement;
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = CSRF_META_NAME;
    document.head.appendChild(metaTag);
  }
  metaTag.content = token;
};

/**
 * Retrieves session data from sessionStorage
 */
const getStoredSessionData = (): SessionData | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    logger.error('Failed to parse stored session data', { error });
    return null;
  }
};

/**
 * Stores session data in sessionStorage
 */
const storeSessionData = (data: SessionData): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Failed to store session data', { error });
  }
};

/**
 * Removes session data from sessionStorage
 */
const removeStoredSessionData = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetches all active sessions for the current user
 */
export const fetchActiveSessions = createAsyncThunk(
  'session/fetchActiveSessions',
  async (_, { rejectWithValue }) => {
    try {
      // Mock implementation - replace with actual API call when available
      const sessions: SessionInfo[] = [];
      logger.debug('Active sessions fetched', { count: sessions.length });
      return sessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
      logger.error('Failed to fetch active sessions', { error });
      return rejectWithValue(message);
    }
  }
);

/**
 * Terminates a specific session by ID
 */
export const terminateSession = createAsyncThunk(
  'session/terminateSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      // Mock implementation - replace with actual API call when available
      logger.info('Session terminated', { sessionId });
      return sessionId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to terminate session';
      logger.error('Failed to terminate session', { error, sessionId });
      return rejectWithValue(message);
    }
  }
);

/**
 * Terminates all sessions except the current one
 */
export const terminateAllSessions = createAsyncThunk(
  'session/terminateAllSessions',
  async (_, { rejectWithValue }) => {
    try {
      // Mock implementation - replace with actual API call when available
      logger.info('All other sessions terminated');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to terminate all sessions';
      logger.error('Failed to terminate all sessions', { error });
      return rejectWithValue(message);
    }
  }
);

/**
 * Creates a new session with proper security setup
 */
export const createSession = createAsyncThunk(
  'session/createSession',
  async (sessionData: SessionData, { dispatch, rejectWithValue }) => {
    try {
      // Store session data securely
      storeSessionData(sessionData);

      // Set session cookie
      setSecureCookie(SESSION_COOKIE_NAME, sessionData.sessionId, SESSION_MAX_AGE_MS / 1000);

      // Generate and set CSRF token
      const csrfToken = generateCsrfToken();
      setCsrfToken(csrfToken);

      // Update Redux state
      dispatch(setSessionData(sessionData));
      dispatch(
        recordActivity({
          type: 'api',
          details: {
            action: 'session_start',
            userId: sessionData.userId,
          },
        })
      );

      logger.info('Session created successfully', {
        component: 'SessionSlice',
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
      });

      return sessionData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      logger.error('Failed to create session', { error });
      return rejectWithValue(message);
    }
  }
);

/**
 * Validates the current session and checks for expiry
 */
export const validateSession = createAsyncThunk(
  'session/validateSession',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { session: SessionState };
      let sessionData = state.session.sessionData;

      // Attempt to retrieve from storage if not in state
      if (!sessionData) {
        sessionData = getStoredSessionData();
      }

      // No session exists
      if (!sessionData) {
        dispatch(resetSessionState());
        return null;
      }

      // Check if session has expired
      const lastActivity = new Date(sessionData.lastActivity);
      const now = new Date();
      const idleTime = now.getTime() - lastActivity.getTime();

      if (idleTime > SESSION_MAX_AGE_MS) {
        logger.info('Session expired', { sessionId: sessionData.sessionId, idleTime });
        dispatch(destroySession());
        return null;
      }

      // Update activity timestamp
      const updatedSessionData = {
        ...sessionData,
        lastActivity: now.toISOString(),
      };

      storeSessionData(updatedSessionData);
      dispatch(updateLastActivity());

      return updatedSessionData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session validation failed';
      logger.error('Session validation failed', { error });
      dispatch(resetSessionState());
      return rejectWithValue(message);
    }
  }
);

/**
 * Destroys the current session and cleans up all session data
 */
export const destroySession = createAsyncThunk(
  'session/destroySession',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Record session end before cleanup
      dispatch(recordActivity({ type: 'api', details: { action: 'session_end' } }));

      // Clear secure storage
      removeStoredSessionData();

      // Clear cookies
      clearCookie(SESSION_COOKIE_NAME);
      clearCookie(CSRF_COOKIE_NAME);

      // Clear localStorage tokens
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }

      // Reset Redux state
      dispatch(resetSessionState());

      logger.info('Session destroyed successfully', { component: 'SessionSlice' });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to destroy session';
      logger.error('Failed to destroy session', { error });
      return rejectWithValue(message);
    }
  }
);

/**
 * Checks for concurrent sessions and alerts if found
 */
export const checkConcurrentSessions = createAsyncThunk(
  'session/checkConcurrentSessions',
  async (_, { dispatch, rejectWithValue, signal }) => {
    try {
      // Check if request was cancelled
      if (signal.aborted) {
        throw new Error('Request cancelled');
      }

      // Skip if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logger.debug('Skipping concurrent session check - offline');
        return [];
      }

      // Mock implementation - replace with actual API call when available
      const sessions: SessionInfo[] = [];

      // Check again after async operation
      if (signal.aborted) {
        throw new Error('Request cancelled');
      }

      const otherSessions = sessions.filter((s: SessionInfo) => !s.current);

      if (otherSessions.length > 0) {
        const warning: SessionWarning = {
          type: 'concurrent_session',
          message: `You have ${otherSessions.length} other active session(s). If this wasn't you, please secure your account.`,
          severity: otherSessions.length > 2 ? 'high' : 'medium',
          timestamp: Date.now(),
        };
        dispatch(addWarning(warning));
        logger.warn('Concurrent sessions detected', { count: otherSessions.length });
      }

      return sessions;
    } catch (error) {
      // Don't process if request was cancelled
      if (signal.aborted || (error instanceof Error && error.message === 'Request cancelled')) {
        return rejectWithValue('Request cancelled');
      }

      const message =
        error instanceof Error ? error.message : 'Failed to check concurrent sessions';
      logger.error('Failed to check concurrent sessions', { error });
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Initial State
// ============================================================================

const initialState: SessionState = {
  // Core session state
  currentSession: null,
  activeSessions: [],
  sessionData: null,

  // Session management
  isActive: false,
  sessionId: null,
  lastActivity: 0,
  config: defaultConfig,

  // Activity tracking
  activityLog: [],

  // Monitoring
  lastErrorLog: 0,

  // Warnings
  warnings: [],

  // Async state
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice Definition
// ============================================================================

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /**
     * Sets the current session information
     */
    setCurrentSession: (state, action: PayloadAction<SessionInfo>) => {
      state.currentSession = action.payload;
      state.lastActivity = Date.now();
      state.isActive = true;
    },

    /**
     * Sets session data and updates related state
     */
    setSessionData: (state, action: PayloadAction<SessionData>) => {
      state.sessionData = action.payload;
      state.sessionId = action.payload.sessionId;
      state.lastActivity = Date.now();
      state.isActive = true;
    },

    /**
     * Updates the last activity timestamp
     */
    updateLastActivity: state => {
      state.lastActivity = Date.now();
    },

    /**
     * Clears any session error
     */
    clearSessionError: state => {
      state.error = null;
    },

    /**
     * Resets the entire session state to initial values
     */
    resetSessionState: state => {
      // Preserve config but reset everything else
      const config = state.config;
      Object.assign(state, initialState, { config });
    },

    /**
     * Records user activity with timestamp and details
     */
    recordActivity: (
      state,
      action: PayloadAction<{
        type: ActivityType;
        details?: Record<string, unknown>;
      }>
    ) => {
      const now = Date.now();
      state.lastActivity = now;

      if (state.config.enableActivityTracking) {
        const activity: SessionActivity = {
          timestamp: now,
          type: action.payload.type,
          details: action.payload.details,
        };

        state.activityLog.push(activity);

        // Maintain a rolling window of activities
        if (state.activityLog.length > MAX_ACTIVITY_LOG_SIZE) {
          state.activityLog = state.activityLog.slice(-MAX_ACTIVITY_LOG_SIZE);
        }

        logger.debug('Activity recorded', {
          component: 'SessionSlice',
          type: action.payload.type,
          totalActivities: state.activityLog.length,
        });
      }
    },

    /**
     * Updates session configuration
     */
    updateSessionConfig: (state, action: PayloadAction<Partial<SessionConfig>>) => {
      state.config = { ...state.config, ...action.payload };
      logger.info('Session config updated', {
        component: 'SessionSlice',
        config: state.config,
      });
    },

    /**
     * Adds a warning to the warnings list
     */
    addWarning: (state, action: PayloadAction<SessionWarning>) => {
      state.warnings.push(action.payload);

      // Limit warnings to prevent memory issues
      if (state.warnings.length > MAX_WARNINGS) {
        state.warnings = state.warnings.slice(-MAX_WARNINGS);
      }
    },

    /**
     * Clears all warnings
     */
    clearWarnings: state => {
      state.warnings = [];
    },

    /**
     * Removes a specific warning by timestamp
     */
    removeWarning: (state, action: PayloadAction<number>) => {
      state.warnings = state.warnings.filter(w => w.timestamp !== action.payload);
    },
  },
  extraReducers: builder => {
    builder
      // Fetch active sessions
      .addCase(fetchActiveSessions.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveSessions.fulfilled, (state, action) => {
        state.activeSessions = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchActiveSessions.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Terminate session
      .addCase(terminateSession.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(terminateSession.fulfilled, (state, action) => {
        state.activeSessions = state.activeSessions.filter(
          session => session.id !== action.payload
        );
        state.isLoading = false;
      })
      .addCase(terminateSession.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Terminate all sessions
      .addCase(terminateAllSessions.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(terminateAllSessions.fulfilled, state => {
        state.activeSessions = [];
        state.isLoading = false;
      })
      .addCase(terminateAllSessions.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Validate session
      .addCase(validateSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.sessionData = action.payload;
        }
      });
  },
});

// ============================================================================
// Actions Export
// ============================================================================

export const {
  setCurrentSession,
  setSessionData,
  updateLastActivity,
  clearSessionError,
  resetSessionState,
  recordActivity,
  updateSessionConfig,
  addWarning,
  clearWarnings,
  removeWarning,
} = sessionSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

// Base selector
const selectSessionState = (state: { session: SessionState }) => state.session;

// Basic selectors with memoization
export const selectCurrentSession = createSelector(
  [selectSessionState],
  session => session.currentSession
);

export const selectActiveSessions = createSelector(
  [selectSessionState],
  session => session.activeSessions
);

export const selectSessionData = createSelector(
  [selectSessionState],
  session => session.sessionData
);

export const selectSessionIsActive = createSelector(
  [selectSessionState],
  session => session.isActive
);

export const selectSessionId = createSelector([selectSessionState], session => session.sessionId);

export const selectSessionLastActivity = createSelector(
  [selectSessionState],
  session => session.lastActivity
);

export const selectSessionConfig = createSelector([selectSessionState], session => session.config);

export const selectActivityLog = createSelector(
  [selectSessionState],
  session => session.activityLog
);

export const selectSessionWarnings = createSelector(
  [selectSessionState],
  session => session.warnings
);

export const selectSessionIsLoading = createSelector(
  [selectSessionState],
  session => session.isLoading
);

export const selectSessionError = createSelector([selectSessionState], session => session.error);

// Computed selectors
export const selectSessionInfo = createSelector([selectSessionState], session => {
  const now = Date.now();
  const idleTime = now - session.lastActivity;
  const timeUntilExpiry = Math.max(0, session.config.maxIdleTime - idleTime);

  return {
    sessionId: session.sessionId,
    isActive: session.isActive,
    lastActivity: session.lastActivity,
    idleTime,
    timeUntilExpiry,
    isExpiringSoon: timeUntilExpiry <= session.config.warningTime,
  };
});

/**
 * Creates a selector for activity summary over a given time window
 */
export const selectActivitySummary = (minutes: number = 10) =>
  createSelector([selectSessionState], session => {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const recentActivities = session.activityLog.filter(a => a.timestamp > cutoff);

    const activityTypes = recentActivities.reduce<Record<string, number>>((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActivities: recentActivities.length,
      activityTypes,
      lastActivity: session.lastActivity,
      timeWindow: minutes,
    };
  });

export const selectIsSessionActive = createSelector([selectSessionState], session => {
  if (!session.isActive) return false;
  const idleTime = Date.now() - session.lastActivity;
  return idleTime < session.config.maxIdleTime;
});

export const selectTimeUntilExpiry = createSelector([selectSessionState], session => {
  const idleTime = Date.now() - session.lastActivity;
  return Math.max(0, session.config.maxIdleTime - idleTime);
});

export const selectSessionStatus = createSelector(
  [selectSessionIsActive, selectSessionIsLoading, selectSessionWarnings],
  (isActive, isLoading, warnings) => ({
    isActive,
    isLoading,
    hasWarnings: warnings.length > 0,
    warningCount: warnings.length,
    criticalWarnings: warnings.filter(w => w.severity === 'critical').length,
  })
);

export const selectRecentActivity = createSelector([selectActivityLog], activityLog =>
  activityLog.slice(-10)
);

/**
 * Selects warnings sorted by severity and timestamp
 */
export const selectSortedWarnings = createSelector([selectSessionWarnings], warnings => {
  const severityOrder: Record<WarningSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...warnings].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.timestamp - a.timestamp; // Most recent first
  });
});

/**
 * Checks if session should show idle warning
 */
export const selectShouldShowIdleWarning = createSelector([selectSessionState], session => {
  if (!session.isActive) return false;
  const idleTime = Date.now() - session.lastActivity;
  const timeUntilExpiry = session.config.maxIdleTime - idleTime;
  return timeUntilExpiry > 0 && timeUntilExpiry <= session.config.warningTime;
});

export default sessionSlice.reducer;
