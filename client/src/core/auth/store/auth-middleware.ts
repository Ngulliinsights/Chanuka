/**
 * Consolidated Authentication Middleware
 *
 * Unified implementation that consolidates:
 * - Auth middleware from store/middleware/authMiddleware.ts
 * - Token refresh logic
 * - Security monitoring
 * - Session tracking
 */

import { Middleware, Dispatch, UnknownAction } from '@reduxjs/toolkit';

import { logger } from '@client/lib/utils/logger';

import { getAuthApiService } from '../services/auth-api-service';
import { tokenManager } from '../services/token-manager';

import { logout, clearError } from './auth-slice';

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

interface AuthAction extends UnknownAction {
  type: string;
  payload?: LoginFulfilledPayload | UserUpdatePayload;
  error?: LoginRejectedPayload;
}

interface RootState {
  auth: {
    isAuthenticated: boolean;
    user?: { id: string } | null;
  };
}

interface StoreApi {
  getState: () => RootState;
  dispatch: Dispatch;
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

  return (store: StoreApi) => next => (action: unknown) => {
    const result = next(action);
    const state = store.getState();

    // Handle authentication-related actions
    if (isAuthAction(action)) {
      switch (action.type) {
        case 'auth/login/fulfilled':
          handleLoginSuccess(action.payload as LoginFulfilledPayload, finalConfig);
          break;

        case 'auth/login/rejected':
          handleLoginFailure(action.error as LoginRejectedPayload, finalConfig);
          break;

        case 'auth/logout/fulfilled':
          handleLogoutSuccess(finalConfig);
          break;

        case 'auth/setUser':
          handleUserUpdate(action.payload as UserUpdatePayload, finalConfig);
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
 * Type guard to check if action is an auth-related action
 */
function isAuthAction(action: unknown): action is AuthAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as { type: unknown }).type === 'string'
  );
}

/**
 * Handle successful login
 */
function handleLoginSuccess(payload: LoginFulfilledPayload, config: AuthMiddlewareConfig): void {
  try {
    logger.info('Login successful', {
      component: 'AuthMiddleware',
      userId: payload.user?.id,
      method: payload.method || 'password',
    });

    // Record security event if monitoring is enabled
    if (config.enableSecurityMonitoring && payload.user) {
      recordSecurityEvent(payload.user.id, 'login', {
        method: payload.method || 'password',
        timestamp: new Date().toISOString(),
        sessionId: payload.sessionId,
      });
    }

    // Clear any cached data for fresh start
    clearSensitiveData();
  } catch (error) {
    logger.error('Error handling login success:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Handle login failure
 */
function handleLoginFailure(error: LoginRejectedPayload, config: AuthMiddlewareConfig): void {
  try {
    logger.warn('Login failed', {
      component: 'AuthMiddleware',
      error: error?.message || 'Unknown error',
    });

    // Record failed login attempt for security monitoring
    if (config.enableSecurityMonitoring) {
      recordFailedLoginAttempt({
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown error',
        userAgent: navigator.userAgent,
      });
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
function handleLogoutSuccess(config: AuthMiddlewareConfig): void {
  try {
    logger.info('Logout successful', { component: 'AuthMiddleware' });

    // Clear tokens
    tokenManager.clearTokens();

    // Clear any sensitive data from localStorage
    clearSensitiveData();

    // Record security event if monitoring is enabled
    if (config.enableSecurityMonitoring) {
      recordSecurityEvent('unknown', 'logout', {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error handling logout:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Handle user data updates
 */
function handleUserUpdate(user: UserUpdatePayload, config: AuthMiddlewareConfig): void {
  try {
    logger.debug('User data updated', {
      component: 'AuthMiddleware',
      userId: user?.id,
    });

    // Record security event for profile updates if monitoring is enabled
    if (config.enableSecurityMonitoring && user?.id) {
      recordSecurityEvent(user.id, 'profile_update', {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error handling user update:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Check if token needs refresh
 */
function checkTokenRefresh(
  store: StoreApi,
  config: AuthMiddlewareConfig,
  refreshPromise: Promise<void> | null,
  setRefreshPromise: (promise: Promise<void> | null) => void
): void {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) return;

  // Check if tokens need refresh
  tokenManager
    .isTokenExpiringSoon(config.refreshThreshold)
    .then(needsRefresh => {
      if (needsRefresh) {
        const promise = performTokenRefresh(store).finally(() => {
          setRefreshPromise(null);
        });
        setRefreshPromise(promise);
      }
    })
    .catch(error => {
      logger.error('Token refresh check failed:', { component: 'AuthMiddleware' }, error);
    });
}

/**
 * Perform token refresh
 */
async function performTokenRefresh(store: StoreApi): Promise<void> {
  try {
    logger.debug('Attempting token refresh', { component: 'AuthMiddleware' });

    const authService = getAuthApiService();
    const authTokens = await authService.refreshTokens();

    if (authTokens && authTokens.accessToken) {
      // Store the new tokens
      await tokenManager.storeTokens(authTokens);

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
      isAuthAction(action) &&
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

/**
 * Record security event for monitoring
 */
function recordSecurityEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown>
): void {
  try {
    // This would typically integrate with a security monitoring service
    logger.info('Security event recorded', {
      component: 'AuthMiddleware',
      userId,
      eventType,
      metadata,
    });

    // In a real implementation, this might send to an analytics service
    // or security monitoring system
  } catch (error) {
    logger.error('Failed to record security event:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Record failed login attempt for security monitoring
 */
function recordFailedLoginAttempt(metadata: Record<string, unknown>): void {
  try {
    logger.warn('Failed login attempt recorded', {
      component: 'AuthMiddleware',
      metadata,
    });

    // In a real implementation, this might trigger rate limiting
    // or other security measures
  } catch (error) {
    logger.error('Failed to record login attempt:', { component: 'AuthMiddleware' }, error);
  }
}

// Export default middleware with default config
export const authMiddleware = createAuthMiddleware();

// Export types for configuration
export type { AuthMiddlewareConfig };

export default {
  createAuthMiddleware,
  authMiddleware,
};
