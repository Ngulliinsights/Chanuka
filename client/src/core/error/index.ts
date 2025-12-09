/**
 * Core Error Management Module
 *
 * Comprehensive error handling system with full feature parity from utils/errors.ts
 * but with enhanced modular architecture for better maintainability.
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
  ErrorMetadata,
  ErrorAnalyticsProvider,
  ErrorReporter,
  ErrorTransformer,
  NavigationErrorType,
} from './types';

// Component types
export type {
  ErrorBoundaryProps as ComponentErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorDisplayMode,
  ErrorFallbackVariant,
  RecoveryUIVariant,
  RecoveryUIProps,
  RecoveryAction as ComponentRecoveryAction,
  UseErrorBoundaryReturn,
} from './components/types';

export {
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
} from './constants';

// ============================================================================
// Error Classes
// ============================================================================

export {
  BaseError,
  ValidationError,
  NetworkError,
  UnauthorizedError,
  NotFoundError,
  CacheError,
  NavigationError,
  NavigationItemNotFoundError,
  InvalidNavigationPathError,
  NavigationAccessDeniedError,
  NavigationValidationError,
  NavigationConfigurationError,
} from './classes';

// ============================================================================
// Core Services
// ============================================================================

export { coreErrorHandler } from './handler';
export {
  createNetworkError,
  createValidationError,
  createAuthError,
} from './handler';

// ============================================================================
// Reporter Integration Methods
// ============================================================================

/**
 * Add an error reporter to the core error handler
 */
export function addErrorReporter(reporter: ErrorReporter): void {
  coreErrorHandler.addReporter(reporter);
}

/**
 * Remove an error reporter from the core error handler
 */
export function removeErrorReporter(reporter: ErrorReporter): boolean {
  return coreErrorHandler.removeReporter(reporter);
}

/**
 * Get all registered error reporters
 */
export function getErrorReporters(): ErrorReporter[] {
  return coreErrorHandler.getReporters();
}

export { ErrorAnalyticsService } from './analytics';
export { ErrorReportingService } from './reporting';

// Comprehensive Error Monitoring with Sentry Integration
export {
  errorMonitoring,
  ErrorBoundary as SentryErrorBoundary,
  errorUtils,
} from './monitoring';

// ============================================================================
// Reporter Classes
// ============================================================================

export { ConsoleReporter } from './reporters/ConsoleReporter';
export { SentryReporter } from './reporters/SentryReporter';
export { ApiReporter } from './reporters/ApiReporter';
export { CompositeReporter } from './reporters/CompositeReporter';

// ============================================================================
// Advanced Analytics Types and Interfaces
// ============================================================================

export type {
  AlertRule,
  AlertCondition,
  AlertChannel,
  Alert,
  AnomalyDetectionConfig,
  AnomalyResult,
  ErrorCorrelation,
  CorrelationPattern,
  PatternRecognitionResult,
  ErrorPattern,
  PatternSignature,
} from './analytics';
export { ErrorRateLimiter } from './rate-limiter';
export { ErrorFactory } from './factory';

// ============================================================================
// Error Boundary Components
// ============================================================================

export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorBoundary,
  ErrorFallback,
  RecoveryUI,
} from './components';

// Legacy exports for backward compatibility
export {
  ErrorBoundary as EnhancedErrorBoundary,
} from './components';


// ============================================================================
// Recovery Strategies
// ============================================================================

export {
  networkRetryStrategy,
  connectionAwareRetryStrategy,
  cacheClearStrategy,
  cacheFallbackStrategy,
  cacheRecoveryStrategy,
  pageReloadStrategy,
  authRefreshStrategy,
  authRetryStrategy,
  authLogoutStrategy,
  gracefulDegradationStrategy,
  offlineModeStrategy,
  reducedFunctionalityStrategy,
  defaultRecoveryStrategies,
  registerDefaultRecoveryStrategies,
  executeRecovery,
  useRecovery,
  isRecoverable,
} from './recovery';

// ============================================================================
// Integration with Existing Unified Error Handler
// ============================================================================

import { useCallback } from 'react';

import { coreErrorHandler } from './handler';
import { registerDefaultRecoveryStrategies } from './recovery';
import type { AppError, ErrorContext, ErrorDomain, ErrorSeverity, ErrorListener, ErrorStats, ErrorHandlerConfig, ErrorReporter } from './types';

/**
 * Initialize the core error management system
 * This should be called during application startup
 */
export function initializeCoreErrorHandling(config?: ErrorHandlerConfig): void {
  coreErrorHandler.initialize(config);
  registerDefaultRecoveryStrategies();

  // Bridge core recovery strategies to unified handler
  // Note: addUnifiedRecoveryStrategy method not available in current implementation
}

/**
 * Get error statistics (from unified handler)
 */
export function getErrorStats(): ErrorStats {
  return coreErrorHandler.getErrorStats();
}

/**
 * Get recent errors (bridged from unified handler)
 */
export function getRecentErrors(limit = 10): AppError[] {
  return coreErrorHandler.getRecentErrors(limit);
}

/**
 * Get errors by type (bridged from unified handler)
 */
export function getErrorsByType(type: ErrorDomain, limit = 10): AppError[] {
  return coreErrorHandler.getErrorsByType(type, limit);
}

/**
 * Get errors by severity (bridged from unified handler)
 */
export function getErrorsBySeverity(severity: ErrorSeverity, limit = 10): AppError[] {
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
export function handleError(errorData: Partial<AppError>): AppError {
  return coreErrorHandler.handleError(errorData);
}

// ============================================================================
// React Hooks for Error Management
// ============================================================================


/**
 * Hook for error handling in React components
 */
export function useCoreErrorHandler() {
  return {
    handleError: useCallback((errorData: Partial<AppError>) =>
      coreErrorHandler.handleError(errorData), []),
    getErrorStats: useCallback(() => coreErrorHandler.getErrorStats(), []),
    addErrorListener: useCallback((listener: ErrorListener) =>
      coreErrorHandler.addErrorListener(listener), []),
    removeErrorListener: useCallback((listener: ErrorListener) =>
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
  type: ErrorDomain,
  severity: ErrorSeverity,
  message: string,
  options?: {
    details?: any;
    context?: Partial<ErrorContext>;
    recoverable?: boolean;
    retryable?: boolean;
  }
): AppError {
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
  type: ErrorDomain,
  severity: ErrorSeverity,
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
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