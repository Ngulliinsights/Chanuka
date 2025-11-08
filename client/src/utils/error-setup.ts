/**
 * Unified Error Handler Setup and Configuration
 * 
 * This module provides a centralized way to configure and initialize
 * the unified error handling system for the entire application.
 */

import { errorHandler, ErrorDomain } from './unified-error-handler';
import { initializeForEnvironment, getErrorSystemStatus, resetErrorSystem } from './error-system-initialization';

/**
 * Initialize the unified error handling system
 * Call this once during application startup
 */
export async function initializeErrorHandling(config?: {
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  logErrors?: boolean;
  maxErrors?: number;
  enableAnalytics?: boolean;
}): Promise<void> {
  try {
    // Determine environment
    const environment = process.env.NODE_ENV as 'development' | 'production' | 'testing';
    
    // Initialize with advanced error handling system
    await initializeForEnvironment(environment || 'development', {
      // Core configuration
      maxErrors: config?.maxErrors || 100,
      enableGlobalHandlers: config?.enableGlobalHandlers ?? true,
      enableRecovery: config?.enableRecovery ?? true,
      logErrors: config?.logErrors ?? true,
      
      // Analytics configuration from environment variables
      analytics: {
        enabled: config?.enableAnalytics ?? (process.env.REACT_APP_ENABLE_ERROR_ANALYTICS === 'true'),
        providers: {
          sentry: process.env.REACT_APP_SENTRY_DSN ? {
            dsn: process.env.REACT_APP_SENTRY_DSN
          } : undefined,
          datadog: process.env.REACT_APP_DATADOG_CLIENT_TOKEN ? {
            clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN,
            site: process.env.REACT_APP_DATADOG_SITE
          } : undefined,
          custom: process.env.REACT_APP_CUSTOM_ERROR_ENDPOINT ? {
            endpoint: process.env.REACT_APP_CUSTOM_ERROR_ENDPOINT,
            apiKey: process.env.REACT_APP_CUSTOM_ERROR_API_KEY
          } : undefined,
        }
      }
    });

    // Add custom recovery strategies
    setupCustomRecoveryStrategies();

    // Log system status
    const status = getErrorSystemStatus();
    console.log('✅ Advanced error handling system initialized', {
      status,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize advanced error handling:', error);
    
    // Fallback to basic error handling
    const fallbackConfig = {
      maxErrors: config?.maxErrors || 50,
      enableGlobalHandlers: config?.enableGlobalHandlers ?? true,
      enableRecovery: config?.enableRecovery ?? false,
      logErrors: config?.logErrors ?? true,
      notificationDebounceMs: 100,
    };

    errorHandler.configure(fallbackConfig);
    setupCustomRecoveryStrategies();
    
    console.log('⚠️ Fallback error handling initialized', {
      config: fallbackConfig,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Setup custom recovery strategies for application-specific errors
 */
function setupCustomRecoveryStrategies() {
  // Example: Custom API retry strategy
  errorHandler.addRecoveryStrategy({
    id: 'api-retry-with-backoff',
    name: 'API Retry with Exponential Backoff',
    description: 'Retry API calls with exponential backoff for transient failures',
    canRecover: (error) =>
      error.type === ErrorDomain.NETWORK &&
      error.details?.status >= 500 &&
      error.details?.status < 600 &&
      (error.retryCount || 0) < 3,
    recover: async (error) => {
      const retryCount = (error.retryCount || 0) + 1;
      const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);

      console.log(`Retrying API call (attempt ${retryCount}) after ${delayMs}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // The actual retry would be handled by the calling code
      // This strategy just implements the delay
      return false; // Return false to let the caller handle the retry
    },
    priority: 1,
    maxRetries: 3,
  });

  // Example: Local storage quota recovery
  errorHandler.addRecoveryStrategy({
    id: 'storage-quota-recovery',
    name: 'Storage Quota Recovery',
    description: 'Clear old data when storage quota is exceeded',
    canRecover: (error) =>
      error.message?.toLowerCase().includes('quota') ||
      error.message?.toLowerCase().includes('storage'),
    recover: async () => {
      try {
        // Clear old cache entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_') || key?.startsWith('temp_')) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key: string) => localStorage.removeItem(key));

        console.log(`Cleared ${keysToRemove.length} cache entries to free storage space`);
        return true;
      } catch (recoveryError) {
        console.error('Failed to clear storage:', recoveryError);
        return false;
      }
    },
    priority: 2,
  });
}

/**
 * Setup error analytics integration
 */
function setupErrorAnalytics() {
  // Add error listener for analytics
  errorHandler.addErrorListener((appError) => {
    // Only track errors in production to avoid noise in development
    if (process.env.NODE_ENV === 'production') {
      // Example analytics tracking (replace with your analytics service)
      try {
        // Analytics service integration would go here
        // analytics.track('error_occurred', {
        //   errorId: error.id,
        //   type: error.type,
        //   severity: error.severity,
        //   message: error.message,
        //   component: error.context?.component,
        //   url: error.context?.url,
        //   userAgent: error.context?.userAgent,
        //   timestamp: error.timestamp,
        //   recoverable: error.recoverable,
        //   recovered: error.recovered,
        // });

        console.log('📊 Error tracked for analytics:', {
          id: appError.id,
          type: appError.type,
          severity: appError.severity,
          component: appError.context?.component,
        });
      } catch (analyticsError) {
        console.warn('Failed to track error analytics:', analyticsError);
      }
    }
  });
}

/**
 * Get error handling statistics for monitoring
 */
export function getErrorStats() {
  return errorHandler.getErrorStats();
}

/**
 * Clear old errors (useful for memory management)
 */
export function cleanupOldErrors() {
  const oneHourAgo = 60 * 60 * 1000;
  const removedCount = errorHandler.clearErrorsOlderThan(oneHourAgo);
  console.log(`🧹 Cleaned up ${removedCount} old errors`);
  return removedCount;
}

/**
 * Export error handler and system utilities for direct access if needed
 */
export { errorHandler };
export { getErrorSystemStatus, resetErrorSystem };

/**
 * Convenience functions for common error types
 */
export {
  createNetworkError,
  createValidationError,
  createAuthError,
  createPermissionError,
  createServerError,
} from './unified-error-handler';