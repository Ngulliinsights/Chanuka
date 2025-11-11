/**
 * Error Recovery Strategies
 *
 * Implements basic recovery strategies for the core error handling system.
 * Provides retry, cache clear, and reload functionality.
 */

import { ErrorDomain, ErrorSeverity } from '../../utils/logger';
import { coreErrorHandler } from './handler';
import { ErrorRecoveryStrategy, RecoveryAction, RecoveryResult } from './types';

// ============================================================================
// Recovery Strategy Implementations
// ============================================================================

/**
 * Network retry recovery strategy with exponential backoff
 */
export const networkRetryStrategy: ErrorRecoveryStrategy = {
  id: 'network-retry',
  name: 'Network Retry',
  description: 'Retry network requests with exponential backoff',
  canRecover: (error) =>
    error.type === ErrorDomain.NETWORK &&
    error.retryable &&
    (error.retryCount || 0) < 3,
  recover: async (error) => {
    const retryCount = (error.retryCount || 0) + 1;
    const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);

    await new Promise(resolve => setTimeout(resolve, delayMs));
    error.retryCount = retryCount;

    return false; // Let caller handle actual retry
  },
  priority: 1,
  maxRetries: 3,
};

/**
 * Cache clear recovery strategy
 */
export const cacheClearStrategy: ErrorRecoveryStrategy = {
  id: 'cache-clear',
  name: 'Cache Clear and Reload',
  description: 'Clear application cache and reload the page',
  canRecover: (error) =>
    error.severity === ErrorSeverity.CRITICAL &&
    error.recoverable,
  recover: async (error) => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear non-critical storage
      const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences'];
      Object.keys(localStorage).forEach(key => {
        if (!criticalKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear session storage but preserve secure tokens
      Object.keys(sessionStorage).forEach(key => {
        if (!criticalKeys.includes(key)) {
          sessionStorage.removeItem(key);
        }
      });

      // Reload after a short delay
      setTimeout(() => window.location.reload(), 500);

      return true;
    } catch (clearError) {
      console.error('Cache clear failed:', clearError);
      return false;
    }
  },
  priority: 2,
};

/**
 * Page reload recovery strategy
 */
export const pageReloadStrategy: ErrorRecoveryStrategy = {
  id: 'page-reload',
  name: 'Page Reload',
  description: 'Reload the current page to recover from error',
  canRecover: (error) =>
    error.severity >= ErrorSeverity.HIGH &&
    error.recoverable,
  recover: async (error) => {
    setTimeout(() => window.location.reload(), 1000);
    return true;
  },
  priority: 3,
};

/**
 * Authentication refresh recovery strategy
 */
export const authRefreshStrategy: ErrorRecoveryStrategy = {
  id: 'auth-refresh',
  name: 'Authentication Refresh',
  description: 'Attempt to refresh authentication tokens',
  canRecover: (error) =>
    error.type === ErrorDomain.AUTHENTICATION &&
    error.recoverable,
  recover: async (error) => {
    try {
      // Check for refresh token
      const refreshToken = localStorage.getItem('refresh_token') ||
                          sessionStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token available, redirect to login
        setTimeout(() => window.location.href = '/auth/login', 1000);
        return false;
      }

      // In a real implementation, this would call your auth refresh endpoint
      // For now, simulate a refresh attempt
      console.log('Attempting authentication refresh');

      // Simulate successful refresh
      return true;
    } catch (refreshError) {
      console.error('Auth refresh failed:', refreshError);
      setTimeout(() => window.location.href = '/auth/login', 1000);
      return false;
    }
  },
  priority: 2,
};

// ============================================================================
// Recovery Utilities
// ============================================================================

/**
 * Execute a recovery action
 */
export async function executeRecovery(errorId: string, action: RecoveryAction): Promise<RecoveryResult> {
  try {
    switch (action) {
      case RecoveryAction.RETRY:
        return await performRetry(errorId);

      case RecoveryAction.CACHE_CLEAR:
        return await performCacheClear();

      case RecoveryAction.RELOAD:
        return performReload();

      case RecoveryAction.REDIRECT:
        return performRedirect('/');

      case RecoveryAction.IGNORE:
      default:
        return {
          success: false,
          action: RecoveryAction.IGNORE,
          message: 'No recovery action taken',
        };
    }
  } catch (error) {
    return {
      success: false,
      action,
      message: `Recovery action failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Perform a retry operation
 */
async function performRetry(errorId: string): Promise<RecoveryResult> {
  // For retry operations, we don't need to access the error directly
  // The retry logic should be handled by the calling code
  // This function just implements the backoff delay

  const delayMs = Math.min(1000 * Math.pow(2, 1), 10000); // Default to first retry delay

  await new Promise(resolve => setTimeout(resolve, delayMs));

  return {
    success: true,
    action: RecoveryAction.RETRY,
    message: 'Retry delay completed',
  };
}

/**
 * Perform cache clearing
 */
async function performCacheClear(): Promise<RecoveryResult> {
  try {
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear non-critical storage
    const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences'];
    Object.keys(localStorage).forEach(key => {
      if (!criticalKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (!criticalKeys.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });

    return {
      success: true,
      action: RecoveryAction.CACHE_CLEAR,
      message: 'Cache cleared successfully',
    };
  } catch (error) {
    return {
      success: false,
      action: RecoveryAction.CACHE_CLEAR,
      message: `Cache clear failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Perform page reload
 */
function performReload(): RecoveryResult {
  setTimeout(() => window.location.reload(), 1000);

  return {
    success: true,
    action: RecoveryAction.RELOAD,
    message: 'Page reload initiated',
  };
}

/**
 * Perform redirect
 */
function performRedirect(path: string): RecoveryResult {
  setTimeout(() => window.location.href = path, 1000);

  return {
    success: true,
    action: RecoveryAction.REDIRECT,
    message: `Redirect to ${path} initiated`,
  };
}

// ============================================================================
// Recovery Strategy Registry
// ============================================================================

/**
 * Default recovery strategies
 */
export const defaultRecoveryStrategies: ErrorRecoveryStrategy[] = [
  networkRetryStrategy,
  authRefreshStrategy,
  cacheClearStrategy,
  pageReloadStrategy,
];

/**
 * Register all default recovery strategies with the core error handler
 */
export function registerDefaultRecoveryStrategies(): void {
  defaultRecoveryStrategies.forEach(strategy => {
    coreErrorHandler.addRecoveryStrategy(strategy);
  });
}

// ============================================================================
// Recovery Hooks and Utilities
// ============================================================================

/**
 * Hook for manual recovery actions
 */
export function useRecovery() {
  return {
    executeRecovery,
    performRetry: (errorId: string) => executeRecovery(errorId, RecoveryAction.RETRY),
    performCacheClear: () => executeRecovery('', RecoveryAction.CACHE_CLEAR),
    performReload: () => executeRecovery('', RecoveryAction.RELOAD),
    performRedirect: (path: string) => performRedirect(path),
  };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverable(error: any): boolean {
  if (!error) return false;

  // Check if it's an AppError with recovery flags
  if (error.recoverable !== undefined) {
    return error.recoverable;
  }

  // Check error type and severity for default recoverability
  const errorType = error.type || ErrorDomain.UNKNOWN;
  const errorSeverity = error.severity || ErrorSeverity.MEDIUM;

  // Network errors are generally recoverable
  if (errorType === ErrorDomain.NETWORK) {
    return true;
  }

  // High severity errors are generally not recoverable
  if (errorSeverity >= ErrorSeverity.CRITICAL) {
    return false;
  }

  // Authentication errors are recoverable
  if (errorType === ErrorDomain.AUTHENTICATION) {
    return true;
  }

  return false;
}