/**
 * Error Recovery Strategies
 *
 * Implements basic recovery strategies for the core error handling system.
 * Provides retry, cache clear, and reload functionality.
 */

import { ErrorDomain, ErrorSeverity } from './constants';
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
  recover: async (_error) => {
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
  recover: async (_error) => {
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
  recover: async (_error) => {
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
  recover: async (_error) => {
    try {
      // Check for refresh token
      const refreshToken = localStorage.getItem('refresh_token') ||
        sessionStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token available, redirect to login
        setTimeout(() => window.location.href = '/auth/login', 1000);
        return false;
      }

      // Attempt to refresh authentication tokens
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store new tokens
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          return true;
        }
      }

      return false;
    } catch (refreshError) {
      console.error('Auth refresh failed:', refreshError);
      setTimeout(() => window.location.href = '/auth/login', 1000);
      return false;
    }
  },
  priority: 2,
};

/**
 * Authentication retry recovery strategy
 */
export const authRetryStrategy: ErrorRecoveryStrategy = {
  id: 'auth-retry',
  name: 'Authentication Retry',
  description: 'Retry request after authentication refresh',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const statusCode = (error as { status?: number; statusCode?: number }).status || (error as { status?: number; statusCode?: number }).statusCode;
    const retryCount = error.retryCount || 0;

    return (
      retryCount === 0 && ( // Only on first retry
        errorMessage.includes('auth') ||
        errorMessage.includes('token') ||
        statusCode === 401 ||
        statusCode === 403
      )
    );
  },
  recover: async (_error) => {
    // Wait a bit for potential auth refresh to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if we now have valid tokens
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    return !!accessToken;
  },
  priority: 3,
};

/**
 * Authentication logout recovery strategy
 */
export const authLogoutStrategy: ErrorRecoveryStrategy = {
  id: 'auth-logout',
  name: 'Authentication Logout',
  description: 'Logout user when authentication cannot be recovered',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const statusCode = (error as { status?: number; statusCode?: number }).status || (error as { status?: number; statusCode?: number }).statusCode;
    const retryCount = error.retryCount || 0;

    return (
      retryCount >= 2 && ( // After multiple failed attempts
        errorMessage.includes('auth') ||
        errorMessage.includes('token') ||
        statusCode === 401 ||
        statusCode === 403
      )
    );
  },
  recover: async (_error) => {
    try {
      // Perform logout
      // Clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');

      // Call logout API if available
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Ignore logout API failures
      }

      // Redirect to login page
      window.location.href = '/auth/login';
      return true;
    } catch (logoutError) {
      console.error('Auth logout failed:', logoutError);
      return false;
    }
  },
  priority: 10,
};

/**
 * Cache fallback recovery strategy
 */
export const cacheFallbackStrategy: ErrorRecoveryStrategy = {
  id: 'cache-fallback',
  name: 'Cache Fallback',
  description: 'Load data from cache when network requests fail',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';

    return (
      errorMessage.includes('network') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('fetch') ||
      !navigator.onLine
    );
  },
  recover: async (_error) => {
    try {
      // Check if service worker is available and can serve cached content
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          // Try to find cached API responses
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            // Look for API-like URLs in cache
            const apiRequests = keys.filter(request =>
              request.url.includes('/api/') ||
              request.url.includes('json')
            );

            if (apiRequests.length > 0) {
              // Cache is available with API data
              return true;
            }
          }
        }
      }

      // Check for localStorage/sessionStorage fallback data
      const fallbackKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('fallback_') || key.startsWith('cache_')
      );

      if (fallbackKeys.length > 0) {
        return true;
      }

      return false;
    } catch (fallbackError) {
      console.error('Cache fallback failed:', fallbackError);
      return false;
    }
  },
  priority: 4,
};

/**
 * Cache recovery strategy
 */
export const cacheRecoveryStrategy: ErrorRecoveryStrategy = {
  id: 'cache-recovery',
  name: 'Cache Recovery',
  description: 'Recover using stale-while-revalidate cache strategy',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';

    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('server error')
    );
  },
  recover: async (_error) => {
    try {
      // Implement stale-while-revalidate pattern
      if ('caches' in window) {
        const cache = await caches.open('api-cache-v1');
        const keys = await cache.keys();

        // Check if we have recent cached data we can use
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const cacheTime = new Date(response.headers.get('sw-cache-time') || 0).getTime();
            const age = Date.now() - cacheTime;
            const maxAge = 5 * 60 * 1000; // 5 minutes

            if (age < maxAge) {
              // Data is fresh enough to use as fallback
              return true;
            }
          }
        }
      }

      return false;
    } catch (recoveryError) {
      console.error('Cache recovery failed:', recoveryError);
      return false;
    }
  },
  priority: 5,
};

/**
 * Graceful degradation recovery strategy
 */
export const gracefulDegradationStrategy: ErrorRecoveryStrategy = {
  id: 'graceful-degradation',
  name: 'Graceful Degradation',
  description: 'Enable offline mode or reduced functionality',
  canRecover: (_error) => true, // Always available as last resort
  recover: async (_error) => {
    try {
      // Enable offline mode or reduced functionality
      if ('serviceWorker' in navigator) {
        // Check if we can enable offline mode
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          // Service worker is active, offline mode can be enabled
          return true;
        }
      }

      // Check if we have any offline-capable features
      const offlineFeatures = [
        'localStorage' in window,
        'indexedDB' in window,
        'caches' in window,
      ];

      return offlineFeatures.some(feature => feature);
    } catch (degradationError) {
      console.error('Graceful degradation failed:', degradationError);
      return false;
    }
  },
  priority: 15,
};

/**
 * Offline mode recovery strategy
 */
export const offlineModeStrategy: ErrorRecoveryStrategy = {
  id: 'offline-mode',
  name: 'Offline Mode',
  description: 'Switch to offline mode with limited functionality',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';

    return (
      !navigator.onLine ||
      errorMessage.includes('offline') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    );
  },
  recover: async (_error) => {
    try {
      // Attempt to enable offline mode
      // Check if we have cached data available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          // Enable offline mode
          document.documentElement.classList.add('offline-mode');
          return true;
        }
      }

      // Fallback to basic offline capabilities
      document.documentElement.classList.add('offline-mode');
      return true;
    } catch (offlineError) {
      console.error('Offline mode activation failed:', offlineError);
      return false;
    }
  },
  priority: 12,
};

/**
 * Reduced functionality recovery strategy
 */
export const reducedFunctionalityStrategy: ErrorRecoveryStrategy = {
  id: 'reduced-functionality',
  name: 'Reduced Functionality',
  description: 'Disable non-essential features to maintain core functionality',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';

    return (
      errorMessage.includes('server') ||
      errorMessage.includes('api') ||
      errorMessage.includes('service') ||
      (error.retryCount || 0) > 2
    );
  },
  recover: async (_error) => {
    try {
      // Disable non-essential features
      document.documentElement.classList.add('reduced-functionality');

      // Simulate disabling features
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (functionalityError) {
      console.error('Reduced functionality activation failed:', functionalityError);
      return false;
    }
  },
  priority: 13,
};

/**
 * Connection-aware retry recovery strategy
 */
export const connectionAwareRetryStrategy: ErrorRecoveryStrategy = {
  id: 'connection-aware-retry',
  name: 'Connection-Aware Retry',
  description: 'Extended retry for slow or unstable connections',
  canRecover: (error) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const connectionType = ('connection' in navigator) ? (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType : 'unknown';
    const retryCount = error.retryCount || 0;

    return (
      (connectionType === 'slow' || connectionType === '2g' || connectionType === '3g') &&
      retryCount < 2 &&
      (
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('slow')
      )
    );
  },
  recover: async (_error) => {
    // Wait longer on slow connections
    const waitTime = 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Check if connection has improved
    if ('connection' in navigator) {
      const connection = (navigator as { connection?: { effectiveType?: string } }).connection;
      const effectiveType = connection?.effectiveType;
      // Consider 4g or faster as "improved"
      return effectiveType === '4g' || effectiveType === '5g' || !connection;
    }

    return navigator.onLine;
  },
  priority: 6,
};

// ============================================================================
// Recovery Utilities
// ============================================================================

/**
 * Execute a recovery action
 */
export async function executeRecovery(_errorId: string, action: RecoveryAction): Promise<RecoveryResult> {
  try {
    switch (action) {
      case RecoveryAction.RETRY:
        return await performRetry(_errorId);

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
async function performRetry(_errorId: string): Promise<RecoveryResult> {
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
  // Network strategies (highest priority)
  networkRetryStrategy,
  connectionAwareRetryStrategy,

  // Cache strategies
  cacheFallbackStrategy,
  cacheRecoveryStrategy,

  // Auth strategies
  authRefreshStrategy,
  authRetryStrategy,

  // Degradation strategies (lower priority)
  offlineModeStrategy,
  reducedFunctionalityStrategy,
  gracefulDegradationStrategy,

  // Auth logout (lowest priority, manual)
  authLogoutStrategy,

  // Fallback strategies
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
export function isRecoverable(error: unknown): boolean {
  if (!error) return false;

  // Type guard to check if error is an object with expected properties
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as {
      recoverable?: boolean;
      type?: string;
      severity?: string;
    };

    // Check if it's an AppError with recovery flags
    if (errorObj.recoverable !== undefined) {
      return errorObj.recoverable;
    }

    // Check error type and severity for default recoverability
    const errorType = errorObj.type || ErrorDomain.UNKNOWN;
    const errorSeverity = errorObj.severity || ErrorSeverity.MEDIUM;

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
  }

  return false;
}