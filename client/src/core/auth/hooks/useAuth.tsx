/**
 * Consolidated useAuth Hook
 * 
 * Unified implementation that consolidates:
 * - useAuth hook from features/users/hooks/useAuth.tsx
 * - React Context + Redux integration
 * - All authentication functionality
 */

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logger } from '../../../utils/logger';
import { getAuthApiService } from '../services/auth-api-service';
import { sessionManager } from '../services/session-manager';
import * as authActions from '../store/auth-slice';
import type {
  User,
  RegisterData,
  AuthResponse,
  TwoFactorSetup,
  PrivacySettings,
  SecurityEvent,
  SuspiciousActivityAlert,
  SessionInfo,
  DataExportRequest,
  DataDeletionRequest,
  AuthContextType,
  LoginCredentials,
} from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MINIMUM_REFRESH_DELAY_MS = 60 * 1000;

/**
 * Consolidated authentication provider that integrates React Context with Redux.
 * 
 * This provider handles:
 * - Authentication state management via Redux
 * - Automatic token refresh
 * - Session validation and monitoring
 * - Comprehensive auth operations
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  const user = useAppSelector(authActions.selectUser);
  const loading = useAppSelector(authActions.selectIsLoading);
  const sessionExpiry = useAppSelector(authActions.selectSessionExpiry);
  const isInitialized = useAppSelector(authActions.selectIsInitialized);
  const twoFactorRequired = useAppSelector(authActions.selectTwoFactorRequired);
  const isAuthenticated = useAppSelector(authActions.selectIsAuthenticated);

  const mountedRef = useRef(true);

  /**
   * Initialize authentication state when the app loads.
   */
  useEffect(() => {
    mountedRef.current = true;

    // Set up session warning listener
    let unsubscribeWarning: (() => void) | undefined;
    if (sessionManager && typeof sessionManager.onWarning === 'function') {
      unsubscribeWarning = sessionManager.onWarning((warning: string) => {
        logger.warn('Session warning:', { 
          component: 'AuthProvider', 
          warning 
        });
      });
    }

    const initializeAuth = async () => {
      try {
        await dispatch(authActions.validateStoredTokens()).unwrap();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Token validation failed:', { 
          component: 'AuthProvider', 
          error: errorMessage 
        });
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (unsubscribeWarning) {
        unsubscribeWarning();
      }
    };
  }, [dispatch]);

  /**
   * Automatic token refresh mechanism.
   */
  useEffect(() => {
    if (!user || !sessionExpiry || !mountedRef.current) return;

    const expiryTime = new Date(sessionExpiry).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    const refreshTime = Math.max(
      timeUntilExpiry - SESSION_REFRESH_BUFFER_MS,
      MINIMUM_REFRESH_DELAY_MS
    );

    if (refreshTime > 0 && refreshTime < 24 * 60 * 60 * 1000) {
      const timeoutId = setTimeout(() => {
        if (mountedRef.current && user && sessionExpiry) {
          dispatch(authActions.refreshTokens());
        }
      }, refreshTime);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [user, sessionExpiry, dispatch]);

  /**
   * Helper to convert Redux results to AuthResponse format.
   * Handles various response types from different auth actions.
   */
  const toAuthResponse = useCallback(
    (result: unknown): AuthResponse => {
      // Handle different response structures
      if (result && typeof result === 'object') {
        const obj = result as Record<string, unknown>;
        return {
          success: true,
          data: {
            user: (obj.user as unknown) || (obj.data as Record<string, unknown>)?.user,
            sessionExpiry: (obj.sessionExpiry as unknown) || (obj.data as Record<string, unknown>)?.sessionExpiry,
          },
        };
      }
      return {
        success: true,
        data: {},
      };
    },
    []
  );

  /**
   * Helper to convert errors to AuthResponse format.
   */
  const toAuthError = useCallback(
    (err: unknown, defaultMessage: string): AuthResponse => {
      const message = err instanceof Error ? err.message : defaultMessage;
      return { success: false, error: message };
    },
    []
  );

  // ==========================================================================
  // Core Authentication Methods
  // ==========================================================================

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.login(credentials)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Login failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.register(data)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Registration failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  const logout = useCallback(async (): Promise<void> => {
    await dispatch(authActions.logout());
  }, [dispatch]);

  const refreshToken = useCallback(async (): Promise<AuthResponse> => {
    try {
      const result = await dispatch(authActions.refreshTokens()).unwrap();
      return toAuthResponse(result);
    } catch (err) {
      return toAuthError(err, 'Token refresh failed');
    }
  }, [dispatch, toAuthResponse, toAuthError]);

  // ==========================================================================
  // Email and Password Management
  // ==========================================================================

  const verifyEmail = useCallback(
    async (token: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.verifyEmail(token)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Email verification failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  const requestPasswordReset = useCallback(
    async (email: string, redirectUrl?: string): Promise<AuthResponse> => {
      try {
        await dispatch(
          authActions.requestPasswordReset({ email, redirectUrl })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password reset request failed');
      }
    },
    [dispatch, toAuthError]
  );

  const resetPassword = useCallback(
    async (token: string, password: string): Promise<AuthResponse> => {
      try {
        await dispatch(
          authActions.resetPassword({ token, newPassword: password, confirmPassword: password })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password reset failed');
      }
    },
    [dispatch, toAuthError]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(
          authActions.changePassword({ currentPassword, newPassword })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password change failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  // ==========================================================================
  // Two-Factor Authentication
  // ==========================================================================

  const setup2FA = useCallback(async (): Promise<TwoFactorSetup> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.setupTwoFactor()).unwrap();
  }, [dispatch, user]);

  const enable2FA = useCallback(
    async (token: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.enableTwoFactor(token)).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Two-factor enable failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  const disable2FA = useCallback(
    async (token: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.disableTwoFactor(token)).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Two-factor disable failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  const verifyTwoFactor = useCallback(
    async (token: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.verifyTwoFactor(token)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Two-factor verification failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const result = await dispatch(
          authActions.updateUserProfile(updates)
        ).unwrap();
        return { success: true, data: { user: result } };
      } catch (err) {
        return toAuthError(err, 'Profile update failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  // ==========================================================================
  // OAuth Integration
  // ==========================================================================

  const loginWithOAuth = useCallback(
    async (code: string, state?: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(
          authActions.loginWithOAuth({ code, state })
        ).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'OAuth login failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  const getOAuthUrl = useCallback(
    (provider: string, state?: string): string => {
      try {
        const authService = getAuthApiService();
        return authService.getOAuthUrl(provider, state);
      } catch (error) {
        logger.warn('getOAuthUrl failed', { error, provider });
        return '';
      }
    },
    []
  );

  // ==========================================================================
  // Session Management
  // ==========================================================================

  const getSessions = useCallback(async (): Promise<SessionInfo[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.getActiveSessions()).unwrap();
  }, [dispatch, user]);

  const revokeSession = useCallback(
    async (sessionId: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.terminateSession(sessionId)).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Terminate session failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  const terminateAllSessions = useCallback(async (): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    try {
      await dispatch(authActions.terminateAllSessions()).unwrap();
      return { success: true };
    } catch (err) {
      return toAuthError(err, 'Terminate all sessions failed');
    }
  }, [dispatch, user, toAuthError]);

  const extendSession = useCallback(async (): Promise<AuthResponse> => {
    try {
      await dispatch(authActions.extendSession()).unwrap();
      return { success: true };
    } catch (err) {
      return toAuthError(err, 'Session extension failed');
    }
  }, [dispatch, toAuthError]);

  // ==========================================================================
  // Privacy and Security
  // ==========================================================================

  const updatePrivacySettings = useCallback(
    async (settings: Partial<PrivacySettings>): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(
          authActions.updatePrivacySettings(settings)
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Update privacy settings failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  const requestDataExport = useCallback(
    async (format: 'json' | 'csv' | 'xml', includes: string[]): Promise<DataExportRequest> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(
        authActions.requestDataExport({ format, includes })
      ).unwrap();
    },
    [dispatch, user]
  );

  const requestDataDeletion = useCallback(
    async (retentionPeriod: string, includes: string[]): Promise<DataDeletionRequest> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(
        authActions.requestDataDeletion({ retentionPeriod, includes })
      ).unwrap();
    },
    [dispatch, user]
  );

  const getSecurityEvents = useCallback(
    async (limit: number = 50): Promise<SecurityEvent[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(authActions.getSecurityEvents(limit)).unwrap();
    },
    [dispatch, user]
  );

  const getSuspiciousActivity = useCallback(async (): Promise<SuspiciousActivityAlert[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.getSuspiciousActivity()).unwrap();
  }, [dispatch, user]);

  // ==========================================================================
  // Authorization Helpers
  // ==========================================================================

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      const userWithPermissions = user as User & { permissions?: string[] };
      return userWithPermissions.permissions?.includes(permission) || false;
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  const clearError = useCallback(() => {
    dispatch(authActions.clearError());
  }, [dispatch]);

  const refreshTokens = useCallback(async (): Promise<void> => {
    await dispatch(authActions.refreshTokens());
  }, [dispatch]);

  const updateUser = useCallback(
    (userData: Partial<User>) => {
      if (user) {
        dispatch(authActions.updateUser(userData));
      }
    },
    [dispatch, user]
  );

  const requestPushPermission = useCallback(async (): Promise<{ granted: boolean }> => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted' };
    }
    return { granted: false };
  }, []);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const value: AuthContextType = {
    user,
    loading,
    sessionExpiry,
    isInitialized,
    twoFactorRequired,
    isAuthenticated,

    login,
    register,
    logout,
    refreshToken,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,

    setupTwoFactor: setup2FA,
    enableTwoFactor: enable2FA,
    disableTwoFactor: disable2FA,
    verifyTwoFactor,

    updateUser,
    updateUserProfile,

    loginWithOAuth,
    getOAuthUrl,

    getActiveSessions: getSessions,
    terminateSession: revokeSession,
    terminateAllSessions,
    extendSession,

    updatePrivacySettings,
    requestDataExport,
    requestDataDeletion,
    getSecurityEvents,
    getSuspiciousActivity,

    hasPermission,
    hasRole,
    hasAnyRole,

    clearError,
    refreshTokens,
    requestPushPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access authentication context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider> to use authentication features.'
    );
  }
  
  return context;
}

/**
 * Legacy compatibility hook for zustand-style auth store
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthStore() {
  const user = useAppSelector(authActions.selectUser);
  return { user } as const;
}