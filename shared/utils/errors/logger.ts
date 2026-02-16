/**
 * Error Logging Utility
 * 
 * Provides consistent error logging with timestamp, severity, stack trace, and context.
 * Integrates with error tracking service if configured.
 * 
 * Requirements: 6.5, 6.6
 */

import type { ErrorContext } from './context';
import { TransformationError, ValidationError, NetworkError } from './types';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLogEntry {
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  errorType: string;
  stackTrace?: string;
  context?: ErrorContext;
  metadata?: Record<string, unknown>;
}

export interface ErrorTrackingService {
  captureError(entry: ErrorLogEntry): void;
  captureException(error: Error, context?: ErrorContext): void;
}

/**
 * Global error tracking service instance
 * Can be configured by the application
 */
let errorTrackingService: ErrorTrackingService | null = null;

/**
 * Configure the error tracking service
 */
export function configureErrorTracking(service: ErrorTrackingService): void {
  errorTrackingService = service;
}

/**
 * Get the configured error tracking service
 */
export function getErrorTrackingService(): ErrorTrackingService | null {
  return errorTrackingService;
}

/**
 * Log an error with full context
 */
export function logError(
  error: Error,
  severity?: ErrorSeverity,
  additionalContext?: Record<string, unknown>
): void {
  const entry = createErrorLogEntry(error, severity, additionalContext);
  
  // Console logging
  logToConsole(entry);
  
  // Send to error tracking service if configured
  if (errorTrackingService) {
    try {
      errorTrackingService.captureError(entry);
    } catch (trackingError) {
      console.error('Failed to send error to tracking service:', trackingError);
    }
  }
}

/**
 * Create an error log entry from an error object
 */
function createErrorLogEntry(
  error: Error,
  severity?: ErrorSeverity,
  additionalContext?: Record<string, unknown>
): ErrorLogEntry {
  const timestamp = new Date();
  let context: ErrorContext | undefined;
  let determinedSeverity: ErrorSeverity = severity || 'medium';

  // Extract context from custom error types
  if (error instanceof TransformationError) {
    context = error.context;
    determinedSeverity = severity || error.context.severity;
  } else if (error instanceof ValidationError) {
    context = error.context;
    determinedSeverity = severity || error.context.severity;
  } else if (error instanceof NetworkError) {
    context = error.context;
    determinedSeverity = severity || error.context.severity;
  }

  return {
    timestamp,
    severity: determinedSeverity,
    message: error.message,
    errorType: error.name || error.constructor.name,
    stackTrace: error.stack,
    context,
    metadata: additionalContext,
  };
}

/**
 * Log error entry to console with appropriate formatting
 */
function logToConsole(entry: ErrorLogEntry): void {
  const prefix = `[${entry.timestamp.toISOString()}] [${entry.severity.toUpperCase()}]`;
  const message = `${prefix} ${entry.errorType}: ${entry.message}`;

  // Use appropriate console method based on severity
  switch (entry.severity) {
    case 'critical':
    case 'high':
      console.error(message);
      break;
    case 'medium':
      console.warn(message);
      break;
    case 'low':
      console.info(message);
      break;
  }

  // Log context if available
  if (entry.context) {
    console.error('Context:', {
      operation: entry.context.operation,
      layer: entry.context.layer,
      field: entry.context.field,
      value: entry.context.value,
      metadata: entry.context.metadata,
    });
  }

  // Log additional metadata if available
  if (entry.metadata) {
    console.error('Metadata:', entry.metadata);
  }

  // Log stack trace for high/critical errors
  if (entry.stackTrace && (entry.severity === 'high' || entry.severity === 'critical')) {
    console.error('Stack trace:', entry.stackTrace);
  }
}

/**
 * Log a transformation error
 */
export function logTransformationError(
  error: TransformationError,
  additionalContext?: Record<string, unknown>
): void {
  logError(error, error.context.severity, additionalContext);
}

/**
 * Log a validation error
 */
export function logValidationError(
  error: ValidationError,
  additionalContext?: Record<string, unknown>
): void {
  logError(error, error.context.severity, {
    ...additionalContext,
    validationErrors: error.validationErrors,
  });
}

/**
 * Log a network error
 */
export function logNetworkError(
  error: NetworkError,
  additionalContext?: Record<string, unknown>
): void {
  logError(error, error.context.severity, {
    ...additionalContext,
    statusCode: error.statusCode,
    retryable: error.retryable,
  });
}

/**
 * Log a critical error (always sends to tracking service)
 */
export function logCriticalError(
  error: Error,
  additionalContext?: Record<string, unknown>
): void {
  logError(error, 'critical', additionalContext);
  
  // Also send exception directly to tracking service
  if (errorTrackingService) {
    try {
      const context = error instanceof TransformationError ||
                     error instanceof ValidationError ||
                     error instanceof NetworkError
        ? error.context
        : undefined;
      
      errorTrackingService.captureException(error, context);
    } catch (trackingError) {
      console.error('Failed to send critical error to tracking service:', trackingError);
    }
  }
}

/**
 * Create a formatted error message for logging
 */
export function formatErrorMessage(
  error: Error,
  includeStack: boolean = false
): string {
  let message = `${error.name}: ${error.message}`;
  
  if (includeStack && error.stack) {
    message += `\n${error.stack}`;
  }
  
  return message;
}

/**
 * Check if an error should be logged based on severity
 */
export function shouldLogError(severity: ErrorSeverity, minSeverity: ErrorSeverity): boolean {
  const severityLevels: Record<ErrorSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  
  return severityLevels[severity] >= severityLevels[minSeverity];
}
