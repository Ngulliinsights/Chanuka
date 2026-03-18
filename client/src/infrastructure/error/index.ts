/**
 * Consolidated Error Management Module
 */

// ============================================================================
// Core Exports (New consolidated system)
// ============================================================================

export { ErrorFactory } from './core/factory';
export { errorHandler } from './core/handler';
export type {
  BaseError,
  ClientError,
  ErrorContext,
  ErrorMetrics,
  ErrorListener,
  ApiErrorResponse,
} from './core/types';
export { isBaseError, isClientError, isApiErrorResponse } from './core/types';

// ============================================================================
// Integration Exports
// ============================================================================

export { createQueryErrorHandler, createMutationErrorHandler } from './integration/react-query';

// ============================================================================
// Patterns (Strategic - Optional)
// ============================================================================

export type { ClientResult, Ok, Err } from './patterns/result';
export {
  ok,
  err,
  isOk,
  isErr,
  safeAsync,
  safe,
  map,
  mapError,
  andThen,
  unwrap,
  unwrapOr,
  match,
  combine,
  fromPromise,
  tap,
  tapError,
} from './patterns/result';

// ============================================================================
// Recovery (Strategic - Auth & User Actions)
// ============================================================================

export {
  authRefreshStrategy,
  authRetryStrategy,
  authLogoutStrategy,
  pageReloadStrategy,
  cacheClearStrategy,
} from './recovery';

// ============================================================================
// Shared Types (Re-export from shared)
// ============================================================================

export { ErrorDomain, ErrorSeverity } from '@shared/core';

// ============================================================================
// Convenience Functions
// ============================================================================

import { ErrorFactory } from './core/factory';
import { errorHandler } from './core/handler';
import { ErrorDomain, ErrorSeverity } from '@shared/core';
import type { ClientError, ErrorContext } from './core/types';

/**
 * Create and track an error
 */
export function createError(
  type: ErrorDomain,
  severity: ErrorSeverity,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    context?: Partial<ErrorContext>;
    recoverable?: boolean;
    retryable?: boolean;
  }
): ClientError {
  const error = ErrorFactory.createClientError(
    'INTERNAL_SERVER_ERROR' as any,
    message,
    type,
    severity,
    options
  );
  return errorHandler.handleError(error);
}

/**
 * Handle an error
 */
export function handleError(error: ClientError): ClientError {
  return errorHandler.handleError(error);
}

// ============================================================================
// Legacy Exports (Backward compatibility - will be deprecated)
// ============================================================================

export type {
  ErrorContext as LegacyErrorContext,
  ErrorRecoveryStrategy,
  RecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener as LegacyErrorListener,
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

export { RecoveryAction } from './constants';

// ============================================================================
// Error Classes
// ============================================================================

export { AppError } from './types';

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

// Dashboard-specific errors
export {
  DashboardError,
  DashboardDataFetchError,
  DashboardActionError,
  DashboardTopicError,
  DashboardConfigurationError,
  getRecoveryStrategy as getDashboardRecoveryStrategy,
  executeRecovery as executeDashboardRecovery,
} from './dashboard-errors';
export type {
  RecoveryContext as DashboardRecoveryContext,
  RecoveryStrategy as DashboardRecoveryStrategy,
} from './dashboard-errors';

// ============================================================================
// Core Services (Legacy - use new core exports instead)
// ============================================================================

// Note: These are re-exported from the new core system for backward compatibility
export { errorHandler as coreErrorHandler } from './core/handler';

// Legacy convenience functions (use ErrorFactory instead)
export function // ============================================================================
// Reporter Integration Methods
// ============================================================================

/**
 * Add an error reporter to the core error handler
 */
addErrorReporter(reporter: ErrorReporter): void {
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

// ============================================================================
// Reporter Classes
// ============================================================================

export { ConsoleReporter } from './reporters/ConsoleReporter';
export { SentryReporter } from './reporters/SentryReporter';
export { ApiReporter } from './reporters/ApiReporter';
export { CompositeReporter } from './reporters/CompositeReporter';

// ============================================================================
// Advanced Analytics
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

// ============================================================================
// HTTP Boundary Serialization
// ============================================================================

export {
  toApiError,
  fromApiError,
  serializeError,
  deserializeError,
  isValidApiErrorResponse,
  errorToClientError,
  sanitizeErrorForDisplay,
  enrichErrorContext,
  cloneError,
} from './serialization';

// ============================================================================
// Error Boundary Components
// ============================================================================

export { ErrorBoundary, ErrorFallback, RecoveryUI } from './components';

// ============================================================================
// User-Friendly Error Message System
// ============================================================================

export type {
  ErrorMessageTemplate,
  LocalizedErrorMessage,
  FormattedErrorMessage,
  FormatOptions,
  RecoverySuggestion,
  SuggestionAnalytics,
  EnhancedErrorMessage,
} from './messages';

export {
  getTemplateById,
  getTemplatesByDomain,
  getTemplatesBySeverity,
  getBestMatchTemplate,
  getLocalizedMessage,
  addLocalizedMessages,
  formatErrorMessage,
  formatMessageWithContext,
  createAppErrorFromError,
  formatMemoryUsage,
  formatErrorForDisplay,
  formatErrorForHTML,
  escapeHtml,
  getErrorSeverityClass,
  getErrorIconClass,
  RECOVERY_SUGGESTIONS,
  getRecoverySuggestions,
  isSuggestionApplicable,
  convertSuggestionsToRecoveryStrategies,
  enhanceSuggestionsWithContext,
  trackSuggestionUsage,
  getSuggestionAnalytics,
  clearSuggestionAnalytics,
  getBestRecoverySuggestion,
  getSuggestionById,
  addCustomRecoverySuggestion,
  removeRecoverySuggestion,
  createEnhancedErrorMessage,
  ErrorMessageService,
  errorMessageService,
} from './messages';

// Legacy exports for backward compatibility
export { ErrorBoundary as EnhancedErrorBoundary } from './components';

// ============================================================================
// Recovery Strategies
// ============================================================================

export {
  networkRetryStrategy,
  connectionAwareRetryStrategy,
  cacheFallbackStrategy,
  cacheRecoveryStrategy,
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
// Initialization and Utilities
// ============================================================================

import { useCallback } from 'react';

import { registerDefaultRecoveryStrategies } from './recovery';
import type {
  AppError,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
  ErrorListener,
  ErrorStats,
  ErrorHandlerConfig,
  ErrorReporter,
} from './types';

/**
 * Initialize the core error management system
 */
export function initializeCoreErrorHandling(config?: ErrorHandlerConfig): void {
  coreErrorHandler.initialize(config);
  registerDefaultRecoveryStrategies();
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  return coreErrorHandler.getErrorStats();
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit = 10): AppError[] {
  return coreErrorHandler.getRecentErrors(limit);
}

/**
 * Get errors by type
 */
export function getErrorsByType(type: ErrorDomain, limit = 10): AppError[] {
  return coreErrorHandler.getErrorsByType(type, limit);
}

/**
 * Get errors by severity
 */
export function getErrorsBySeverity(severity: ErrorSeverity, limit = 10): AppError[] {
  return coreErrorHandler.getErrorsBySeverity(severity, limit);
}

/**
 * Clear all errors
 */
export function clearErrors(): void {
  coreErrorHandler.clearErrors();
}

/**
 * Hook for error handling in React components
 */
export function useCoreErrorHandler() {
  return {
    handleError: useCallback(
      (errorData: Partial<AppError>) => coreErrorHandler.handleError(errorData),
      []
    ),
    getErrorStats: useCallback(() => coreErrorHandler.getErrorStats(), []),
    addErrorListener: useCallback(
      (listener: ErrorListener) => coreErrorHandler.addErrorListener(listener),
      []
    ),
    removeErrorListener: useCallback(
      (listener: ErrorListener) => coreErrorHandler.removeErrorListener(listener),
      []
    ),
  };
}

/**
 * Log an error without throwing
 */
export function logError(
  type: ErrorDomain,
  severity: ErrorSeverity,
  message: string,
  details?: Record<string, unknown>,
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
// Default Export
// ============================================================================

export default {
  initialize: initializeCoreErrorHandling,
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
};
