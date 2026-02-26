/**
 * Core Error Management Module
 *
 * Comprehensive error handling system with full feature parity
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  ErrorContext,
  ErrorRecoveryStrategy,
  RecoveryStrategy,
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

// Unified error types (aligned with server StandardizedError)
export type {
  BaseError,
  ClientError,
  ApiErrorResponse,
  RecoveryStrategy as UnifiedRecoveryStrategy,
  RecoveryResult as UnifiedRecoveryResult,
} from './unified-types';

export {
  isBaseError,
  isClientError,
  isApiErrorResponse,
  standardErrorToBaseError,
} from './unified-types';

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

export { ErrorDomain, ErrorSeverity, RecoveryAction } from './constants';

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
} from './dashboard-errors';

// ============================================================================
// Core Services
// ============================================================================

export { coreErrorHandler } from './handler';
export { createNetworkError, createValidationError, createAuthError } from './handler';

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
export { ErrorFactory } from './factory';

// Unified factory functions (pure, no side effects)
export {
  createValidationError as createUnifiedValidationError,
  createNetworkError as createUnifiedNetworkError,
  createAuthenticationError,
  createAuthorizationError,
  createBusinessError,
  createSystemError,
  createNotFoundError,
  createTimeoutError,
  createClientError,
} from './unified-factory';

// HTTP boundary serialization
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
// Initialization and Utilities
// ============================================================================

import { useCallback } from 'react';

import { coreErrorHandler } from './handler';
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
 * Handle an error through the core system
 */
export function handleError(errorData: Partial<AppError>): AppError {
  return coreErrorHandler.handleError(errorData);
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
 * Create a standardized error object
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
