/**
 * Authentication Middleware
 * Handles authentication state changes, token refresh, and security monitoring
 */

import { securityMonitor } from '@client/lib/utils/security';
import { Middleware, Dispatch, UnknownAction } from '@reduxjs/toolkit';

import { authApiService as authService } from '@client/core/api';
import { logout, tokenManager, clearError } from '@client/core/auth';
import { rbacManager } from '@client/core/auth/rbac';
import { requestDeduplicator } from '@client/lib/infrastructure/http/request-deduplicator';
import { logger } from '@client/lib/utils/logger';

import { setCurrentSession, recordActivity } from '../slices/sessionSlice';

interface AuthMiddlewareConfig {
  enableAutoRefresh: boolean;
  enableSecurityMonitoring: boolean;
  refreshThreshold: number; // minutes before expiry to refresh
}

interface LoginFulfilledPayload {
  user?: { id: string };
  sessionExpiry?: string;
  requires2FA?: boolean;
  sessionId?: string;
  method?: string;
}

interface LoginRejectedPayload {
  message?: string;
}

interface UserUpdatePayload {
  id?: string;
}

const DEFAULT_CONFIG: AuthMiddlewareConfig = {
  enableAutoRefresh: true,
  enableSecurityMonitoring: true,
  refreshThreshold: 5, // 5 minutes
};

/**
 * Creates authentication middleware with configuration
 */
export const createAuthMiddleware = (config: Partial<AuthMiddlewareConfig> = {}): Middleware => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let refreshPromise: Promise<void> | null = null;

  return store => next => (action: unknown) => {
    const result = next(action);
    const state = store.getState();

    // Handle authentication-related actions
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      typeof action.type === 'string'
    ) {
      switch (action.type) {
        case 'auth/login/fulfilled':
          if ('payload' in action) {
            handleLoginSuccess(
              action.payload as LoginFulfilledPayload,
              finalConfig,
              store.dispatch
            );
          }
          break;

        case 'auth/login/rejected':
          if ('error' in action) {
            handleLoginFailure(action.error as LoginRejectedPayload, finalConfig);
          }
          break;

        case 'auth/logout/fulfilled':
          handleLogoutSuccess(finalConfig, store.dispatch);
          break;

        case 'auth/setUser':
          if ('payload' in action) {
            handleUserUpdate(action.payload as UserUpdatePayload, finalConfig);
          }
          break;

        // Monitor for actions that require authentication
        default:
          if (requiresAuthentication(action) && !state.auth.isAuthenticated) {
            logger.warn('Unauthenticated action attempted:', {
              component: 'AuthMiddleware',
              action: action.type,
              user: state.auth.user?.id,
            });

            // Dispatch logout to clear any stale state
            store.dispatch(logout() as unknown as UnknownAction);
          }
          break;
      }
    }

    // Check for token refresh needs
    if (finalConfig.enableAutoRefresh && state.auth.isAuthenticated) {
      checkTokenRefresh(store, finalConfig, refreshPromise, promise => {
        refreshPromise = promise;
      });
    }

    return result;
  };
};

/**
 * Handle successful login
 */
function handleLoginSuccess(
  payload: LoginFulfilledPayload,
  config: AuthMiddlewareConfig,
  dispatch: Dispatch
): void {
  try {
    logger.info('Login successful', {
      component: 'AuthMiddleware',
      userId: payload.user?.id,
      method: payload.method || 'password',
    });

    // Start session monitoring
    if (payload.user) {
      dispatch(
        setCurrentSession({
          id: payload.sessionId || crypto.randomUUID(),
          userId: payload.user.id,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          ipAddress: '',
          deviceInfo: navigator.userAgent,
          current: true,
        })
      );
      dispatch(
        recordActivity({
          type: 'api',
          details: { action: 'session_start', userId: payload.user.id },
        })
      );
    }

    // Record security event
    if (config.enableSecurityMonitoring && payload.user) {
      const securityEvent = securityMonitor.createSecurityEvent(payload.user.id, 'login', {
        method: payload.method || 'password',
        timestamp: new Date().toISOString(),
      });
      securityMonitor.logSecurityEvent(securityEvent);
    }

    // Clear any cached permissions for fresh start
    if (payload.user) {
      rbacManager.clearCache();
    }
  } catch (error) {
    logger.error('Error handling login success:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Handle login failure
 */
function handleLoginFailure(error: LoginRejectedPayload, _config: AuthMiddlewareConfig): void {
  try {
    logger.warn('Login failed', {
      component: 'AuthMiddleware',
      error: error?.message || 'Unknown error',
    });

    // Record failed login attempt for security monitoring
    if (_config.enableSecurityMonitoring) {
      const currentIP = '0.0.0.0'; // Would be provided by server in production
      securityMonitor.recordLoginAttempt(currentIP, navigator.userAgent, false);
    }

    // Clear any stale tokens
    tokenManager.clearTokens();
  } catch (err) {
    logger.error('Error handling login failure:', { component: 'AuthMiddleware' }, err);
  }
}

/**
 * Handle successful logout
 */
function handleLogoutSuccess(_config: AuthMiddlewareConfig, dispatch: Dispatch): void {
  try {
    logger.info('Logout successful', { component: 'AuthMiddleware' });

    // End session
    dispatch(recordActivity({ type: 'api', details: { action: 'session_end' } }));

    // Clear tokens
    tokenManager.clearTokens();

    // Clear permission cache
    rbacManager.clearCache();

    // Clear any sensitive data from localStorage
    clearSensitiveData();
  } catch (error) {
    logger.error('Error handling logout:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Handle user data updates
 */
function handleUserUpdate(user: UserUpdatePayload, _config: AuthMiddlewareConfig): void {
  try {
    logger.debug('User data updated', {
      component: 'AuthMiddleware',
      userId: user?.id,
    });

    // Clear permission cache when user data changes
    if (user?.id) {
      rbacManager.clearCache();
    }
  } catch (error) {
    logger.error('Error handling user update:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Check if token needs refresh
 */
function checkTokenRefresh(
  store: { dispatch: Dispatch },
  config: AuthMiddlewareConfig,
  refreshPromise: Promise<void> | null,
  setRefreshPromise: (promise: Promise<void> | null) => void
): void {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) return;

  const tokens = tokenManager.getTokens();
  if (!tokens) return;

  const timeUntilExpiry = tokenManager.getTimeUntilExpiry();
  const refreshThresholdMs = config.refreshThreshold * 60 * 1000;

  if (timeUntilExpiry !== null && timeUntilExpiry < refreshThresholdMs) {
    const promise = performTokenRefresh(store).finally(() => {
      setRefreshPromise(null);
    });
    setRefreshPromise(promise);
  }
}

/**
 * Perform token refresh with deduplication to prevent race conditions
 */
async function performTokenRefresh(store: { dispatch: Dispatch }): Promise<void> {
  return requestDeduplicator.deduplicate('token-refresh', async () => {
    try {
      logger.debug('Attempting token refresh', { component: 'AuthMiddleware' });

      const authTokens = await authService.instance.refreshTokens();

      if (authTokens && authTokens.accessToken) {
        // Convert AuthTokens to JWTTokens format for tokenManager
        const jwtTokens = {
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
          expiresIn: authTokens.expiresIn,
          expiresAt: new Date(Date.now() + authTokens.expiresIn * 1000), // Convert seconds to milliseconds
          tokenType: authTokens.tokenType || 'Bearer',
        };

        tokenManager.storeTokens(jwtTokens);

        // Clear any auth errors
        store.dispatch(clearError());

        logger.info('Token refreshed successfully', {
          component: 'AuthMiddleware',
        });
      } else {
        logger.warn('Token refresh failed, logging out user', {
          component: 'AuthMiddleware',
        });

        // Token refresh failed, logout user
        store.dispatch(logout() as unknown as UnknownAction);
      }
    } catch (error) {
      logger.error('Token refresh error:', { component: 'AuthMiddleware' }, error);

      // On error, logout user for security
      store.dispatch(logout() as unknown as UnknownAction);
    }
  });
}

/**
 * Check if action requires authentication
 */
function requiresAuthentication(action: unknown): boolean {
  const protectedActions = [
    // User actions
    'user/updateProfile',
    'user/updatePreferences',
    'user/deleteAccount',

    // Bill actions
    'bills/saveBill',
    'bills/addComment',
    'bills/vote',

    // Admin actions
    'admin/',

    // Any action with 'authenticated' in the type
  ];

  return protectedActions.some(
    pattern =>
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      typeof action.type === 'string' &&
      (action.type.includes(pattern) || action.type.includes('authenticated'))
  );
}

/**
 * Clear sensitive data from storage
 */
function clearSensitiveData(): void {
  try {
    // Clear specific sensitive keys
    const sensitiveKeys = ['user_preferences', 'saved_bills', 'draft_comments', 'search_history'];

    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    logger.error('Error clearing sensitive data:', { component: 'AuthMiddleware' }, error);
  }
}

// Export default middleware with default config
export const authMiddleware = createAuthMiddleware();

// Export types for configuration
export type { AuthMiddlewareConfig };
