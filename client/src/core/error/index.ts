/**
 * Core Error Management Module
 *
 * Unified exports for the client-side error handling system.
 * Provides a clean API for error management across the application.
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener,
  ErrorStats,
  ReactErrorInfo,
  ErrorBoundaryProps,
  ErrorFallbackProps,
  RecoveryResult,
} from './types';

export {
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
} from './types';

// ============================================================================
// Core Error Handler
// ============================================================================

export { coreErrorHandler } from './handler';
export {
  createNetworkError,
  createValidationError,
  createAuthError,
} from './handler';

// ============================================================================
// Error Boundary Components
// ============================================================================

export {
  EnhancedErrorBoundary,
  useErrorBoundary,
  withErrorBoundary,
} from './ErrorBoundary';

// ============================================================================
// Recovery Strategies
// ============================================================================

export {
  networkRetryStrategy,
  cacheClearStrategy,
  pageReloadStrategy,
  authRefreshStrategy,
  defaultRecoveryStrategies,
  registerDefaultRecoveryStrategies,
  executeRecovery,
  useRecovery,
  isRecoverable,
} from './recovery';

// ============================================================================
// Integration with Existing Unified Error Handler
// ============================================================================

import { coreErrorHandler } from './handler';
import { registerDefaultRecoveryStrategies } from './recovery';

/**
 * Initialize the core error management system
 * This should be called during application startup
 */
export function initializeCoreErrorHandling(config?: import('./types').ErrorHandlerConfig): void {
  coreErrorHandler.initialize(config);
  registerDefaultRecoveryStrategies();

  // Bridge core recovery strategies to unified handler
  if (coreErrorHandler.addUnifiedRecoveryStrategy) {
    // Add core strategies to unified handler for enhanced integration
    const strategies = [
      {
        id: 'core-network-retry',
        name: 'Core Network Retry',
        description: 'Enhanced network retry from core system',
        canRecover: (error: any) => error.type === 'network' && error.retryable,
        recover: async (error: any) => {
          // Delegate to core handler's network retry logic
          return coreErrorHandler['attemptRecovery'](error).then(result => result.success);
        },
        priority: 1,
      },
      {
        id: 'core-cache-clear',
        name: 'Core Cache Clear',
        description: 'Cache clearing from core system',
        canRecover: (error: any) => error.severity === 'critical',
        recover: async (error: any) => {
          return coreErrorHandler['attemptRecovery'](error).then(result => result.success);
        },
        priority: 2,
      },
    ];

    strategies.forEach(strategy => {
      coreErrorHandler.addUnifiedRecoveryStrategy(strategy);
    });
  }
}

/**
 * Get error statistics (from unified handler)
 */
export function getErrorStats(): import('./types').ErrorStats {
  return coreErrorHandler.getErrorStats();
}

/**
 * Get recent errors (bridged from unified handler)
 */
export function getRecentErrors(limit = 10): any[] {
  return coreErrorHandler.getRecentErrors(limit);
}

/**
 * Get errors by type (bridged from unified handler)
 */
export function getErrorsByType(type: import('./types').ErrorDomain, limit = 10): any[] {
  return coreErrorHandler.getErrorsByType(type, limit);
}

/**
 * Get errors by severity (bridged from unified handler)
 */
export function getErrorsBySeverity(severity: import('./types').ErrorSeverity, limit = 10): any[] {
  return coreErrorHandler.getErrorsBySeverity(severity, limit);
}

/**
 * Clear all errors (bridged to unified handler)
 */
export function clearErrors(): void {
  coreErrorHandler.clearErrors();
}

/**
 * Handle an error through the core system (with unified integration)
 */
export function handleError(errorData: Partial<import('./types').AppError>): import('./types').AppError {
  return coreErrorHandler.handleError(errorData);
}

// ============================================================================
// React Hooks for Error Management
// ============================================================================

import { useCallback } from 'react';

/**
 * Hook for error handling in React components
 */
export function useCoreErrorHandler() {
  return {
    handleError: useCallback((errorData: Partial<import('./types').AppError>) =>
      coreErrorHandler.handleError(errorData), []),
    getErrorStats: useCallback(() => coreErrorHandler.getErrorStats(), []),
    addErrorListener: useCallback((listener: import('./types').ErrorListener) =>
      coreErrorHandler.addErrorListener(listener), []),
    removeErrorListener: useCallback((listener: import('./types').ErrorListener) =>
      coreErrorHandler.removeErrorListener(listener), []),
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a standardized error object
 */
export function createError(
  type: import('./types').ErrorDomain,
  severity: import('./types').ErrorSeverity,
  message: string,
  options?: {
    details?: any;
    context?: Partial<import('./types').ErrorContext>;
    recoverable?: boolean;
    retryable?: boolean;
  }
): import('./types').AppError {
  return coreErrorHandler.handleError({
    type,
    severity,
    message,
    details: options?.details,
    context: options?.context,
    recoverable: options?.recoverable ?? true,
    retryable: options?.retryable ?? false,
  });
}

/**
 * Log an error without throwing
 */
export function logError(
  type: import('./types').ErrorDomain,
  severity: import('./types').ErrorSeverity,
  message: string,
  details?: any,
  context?: Partial<import('./types').ErrorContext>
): import('./types').AppError {
  return coreErrorHandler.handleError({
    type,
    severity,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });
}

// ============================================================================
// Unified Error Handler Bridge
// ============================================================================

/**
 * Bridge function to ensure unified error handler uses core recovery strategies
 */
export function bridgeToUnifiedHandler(): void {
  // This function can be called to establish deeper integration
  // between core error handler and unified error handler
  if (typeof window !== 'undefined' && (window as any).unifiedErrorHandler) {
    const unified = (window as any).unifiedErrorHandler;

    // Add core recovery strategies to unified handler
    if (unified.addRecoveryStrategy) {
      const coreStrategies = [
        {
          id: 'core-network-retry-bridge',
          name: 'Core Network Retry (Bridged)',
          description: 'Network retry bridged from core error system',
          canRecover: (error: any) => error.type === 'network' && error.retryable,
          recover: async (error: any) => {
            try {
              const result = await coreErrorHandler['attemptRecovery'](error);
              return result.success;
            } catch {
              return false;
            }
          },
          priority: 1,
        },
        {
          id: 'core-cache-clear-bridge',
          name: 'Core Cache Clear (Bridged)',
          description: 'Cache clearing bridged from core error system',
          canRecover: (error: any) => error.severity === 'critical',
          recover: async (error: any) => {
            try {
              const result = await coreErrorHandler['attemptRecovery'](error);
              return result.success;
            } catch {
              return false;
            }
          },
          priority: 2,
        },
      ];

      coreStrategies.forEach(strategy => {
        try {
          unified.addRecoveryStrategy(strategy);
        } catch (e) {
          console.warn('Failed to bridge recovery strategy to unified handler:', e);
        }
      });
    }
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  initialize: initializeCoreErrorHandling,
  bridge: bridgeToUnifiedHandler,
  handler: coreErrorHandler,
  handleError,
  getErrorStats,
  getRecentErrors,
  getErrorsByType,
  getErrorsBySeverity,
  clearErrors,
  createError,
  logError,
  useErrorHandler: useCoreErrorHandler,
  // ErrorBoundary: EnhancedErrorBoundary,
  // recovery: {
  //   executeRecovery,
  //   useRecovery,
  //   isRecoverable,
  // },
};