/**
 * Authentication Middleware
 * Handles authentication state changes, token refresh, and security monitoring
 */

import { Middleware } from '@reduxjs/toolkit';
import { authApiService as authService } from '../../core/api';
import { tokenManager } from '../../utils/tokenManager';
import { setCurrentSession, recordActivity } from '../slices/sessionSlice';
import { securityMonitor } from '../../utils/security-monitoring';
import { rbacManager } from '../../utils/rbac';
import { logger } from '../../utils/logger';
import { logout, setUser, clearError } from '../slices/authSlice';

interface AuthMiddlewareConfig {
  enableAutoRefresh: boolean;
  enableSecurityMonitoring: boolean;
  refreshThreshold: number; // minutes before expiry to refresh
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

  return (store) => (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    // Handle authentication-related actions
    switch (action.type) {
      case 'auth/login/fulfilled':
        handleLoginSuccess(action.payload, finalConfig);
        break;

      case 'auth/login/rejected':
        handleLoginFailure(action.error, finalConfig);
        break;

      case 'auth/logout/fulfilled':
        handleLogoutSuccess(finalConfig);
        break;

      case 'auth/setUser':
        handleUserUpdate(action.payload, finalConfig);
        break;

      // Monitor for actions that require authentication
      default:
        if (requiresAuthentication(action) && !state.auth.isAuthenticated) {
          logger.warn('Unauthenticated action attempted:', {
            component: 'AuthMiddleware',
            action: action.type,
            user: state.auth.user?.id
          });
          
          // Dispatch logout to clear any stale state
          store.dispatch(logout());
        }
        break;
    }

    // Check for token refresh needs
    if (finalConfig.enableAutoRefresh && state.auth.isAuthenticated) {
      checkTokenRefresh(store, finalConfig);
    }

    return result;
  };
};

/**
 * Handle successful login
 */
function handleLoginSuccess(payload: any, config: AuthMiddlewareConfig): void {
  try {
    logger.info('Login successful', {
      component: 'AuthMiddleware',
      userId: payload.user?.id,
      method: payload.method || 'password'
    });

    // Start session monitoring
    if (payload.user) {
      dispatch(setCurrentSession({
        id: payload.sessionId || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        ipAddress: '',
        deviceInfo: navigator.userAgent,
        current: true
      }));
      dispatch(recordActivity({ type: 'api', details: { action: 'session_start', userId: payload.user.id } }));
    }

    // Record security event
    if (config.enableSecurityMonitoring && payload.user) {
      const securityEvent = securityMonitor.createSecurityEvent(
        payload.user.id,
        'login',
        {
          method: payload.method || 'password',
          timestamp: new Date().toISOString()
        }
      );
      securityMonitor.logSecurityEvent(securityEvent);
    }

    // Clear any cached permissions for fresh start
    if (payload.user) {
      rbacManager.clearUserCache(payload.user.id);
    }

  } catch (error) {
    logger.error('Error handling login success:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Handle login failure
 */
function handleLoginFailure(error: any, config: AuthMiddlewareConfig): void {
  try {
    logger.warn('Login failed', {
      component: 'AuthMiddleware',
      error: error?.message || 'Unknown error'
    });

    // Record failed login attempt for security monitoring
    if (config.enableSecurityMonitoring) {
      const currentIP = '0.0.0.0'; // Would be provided by server in production
      securityMonitor.recordLoginAttempt(
        currentIP,
        navigator.userAgent,
        false
      );
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
function handleUserUpdate(user: any, config: AuthMiddlewareConfig): void {
  try {
    logger.debug('User data updated', {
      component: 'AuthMiddleware',
      userId: user?.id
    });

    // Clear permission cache when user data changes
    if (user?.id) {
      rbacManager.clearUserCache(user.id);
    }

  } catch (error) {
    logger.error('Error handling user update:', { component: 'AuthMiddleware' }, error);
  }
}

/**
 * Check if token needs refresh
 */
function checkTokenRefresh(store: any, config: AuthMiddlewareConfig): void {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) return;

  const tokens = tokenManager.getTokens();
  if (!tokens) return;

  const timeUntilExpiry = tokenManager.getTimeUntilExpiry();
  const refreshThresholdMs = config.refreshThreshold * 60 * 1000;

  if (timeUntilExpiry !== null && timeUntilExpiry < refreshThresholdMs) {
    refreshPromise = performTokenRefresh(store)
      .finally(() => {
        refreshPromise = null;
      });
  }
}

/**
 * Perform token refresh
 */
async function performTokenRefresh(store: any): Promise<void> {
  try {
    logger.debug('Attempting token refresh', { component: 'AuthMiddleware' });

    const result = await authService.refreshTokens();

    if (result.success && result.data?.tokens && result.user) {
      // Update tokens
      tokenManager.storeTokens(result.data.tokens, result.user);
      
      // Update user in store
      store.dispatch(setUser(result.user));
      
      // Clear any auth errors
      store.dispatch(clearError());

      logger.info('Token refreshed successfully', {
        component: 'AuthMiddleware',
        userId: result.user.id
      });

    } else {
      logger.warn('Token refresh failed, logging out user', {
        component: 'AuthMiddleware',
        error: result.error
      });

      // Token refresh failed, logout user
      store.dispatch(logout());
    }

  } catch (error) {
    logger.error('Token refresh error:', { component: 'AuthMiddleware' }, error);
    
    // On error, logout user for security
    store.dispatch(logout());
  }
}

/**
 * Check if action requires authentication
 */
function requiresAuthentication(action: any): boolean {
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

  return protectedActions.some(pattern => 
    action.type.includes(pattern) || action.type.includes('authenticated')
  );
}

/**
 * Clear sensitive data from storage
 */
function clearSensitiveData(): void {
  try {
    // Clear specific sensitive keys
    const sensitiveKeys = [
      'user_preferences',
      'saved_bills',
      'draft_comments',
      'search_history'
    ];

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