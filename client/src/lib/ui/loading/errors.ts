/**
 * Loading-specific Error Types
 * 
 * Uses shared base error classes from dashboard/errors.ts (canonical source)
 * to eliminate duplication across the error handling system.
 */

// Re-export shared base types so existing consumers don't break
export {
  ErrorDomain,
  ErrorSeverity,
  BaseError,
  NetworkError,
  ValidationError,
} from '@client/lib/ui/dashboard/errors';

export type {
  ErrorContext,
  BaseErrorOptions,
} from '@client/lib/ui/dashboard/errors';

import {
  BaseError,
  NetworkError,
  ValidationError,
  ErrorDomain,
  ErrorSeverity,
} from '@client/lib/ui/dashboard/errors';

import type { ErrorContext } from '@client/lib/ui/dashboard/errors';

// ============================================================================
// Loading Error Classes
// ============================================================================

/**
 * Loading operation error - unified with core error system
 * 
 * @example
 * throw new LoadingError('Failed to load data', {
 *   statusCode: 400,
 *   code: 'LOADING_FAILED',
 *   context: { operation: 'fetchBills' }
 * });
 */
export class LoadingError extends BaseError {
  public override readonly name: string;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(message, {
      statusCode: options?.statusCode ?? 400,
      code: options?.code ?? 'LOADING_ERROR',
      domain: ErrorDomain.UI,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoverable: true,
      context: options?.context,
      cause: options?.cause,
    });
    this.name = 'LoadingError';
  }
}

/**
 * Loading timeout error - for operations that exceed timeout
 * 
 * @example
 * throw new LoadingTimeoutError('fetchBills', 5000, {
 *   context: { component: 'BillsPage' }
 * });
 */
export class LoadingTimeoutError extends NetworkError {
  public override readonly name: string;
  public readonly operation: string;
  public readonly timeout: number;

  constructor(
    operationId: string,
    timeout: number,
    options?: {
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(
      `Loading operation timed out after ${timeout}ms: ${operationId}`,
      {
        operation: operationId,
        timeout,
        ...options?.context,
      }
    );
    this.name = 'LoadingTimeoutError';
    this.operation = operationId;
    this.timeout = timeout;
  }
}

/**
 * Loading network error - for network-related loading failures
 * 
 * @example
 * throw new LoadingNetworkError('Network connection failed', {
 *   context: { component: 'BillsList' }
 * });
 */
export class LoadingNetworkError extends NetworkError {
  public override readonly name: string;
  public override readonly statusCode: number;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(message, options?.context);
    this.name = 'LoadingNetworkError';
    this.statusCode = options?.statusCode ?? 503;
  }
}

/**
 * Loading validation error - for validation failures during load
 * 
 * @example
 * throw new LoadingValidationError('Invalid response format', {
 *   context: { component: 'DataValidator' }
 * });
 */
export class LoadingValidationError extends ValidationError {
  public override readonly name: string;

  constructor(
    message: string,
    options?: {
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(message, { validation: [message] }, options?.context);
    this.name = 'LoadingValidationError';
  }
}

/**
 * Loading operation failed error - for general operation failures
 * 
 * @example
 * throw new LoadingOperationFailedError('fetchBills', 'Server returned error', 2);
 */
export class LoadingOperationFailedError extends BaseError {
  public override readonly name: string;
  public readonly operation: string;
  public readonly retryCount?: number;

  constructor(
    operationId: string,
    message: string,
    retryCount?: number,
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(`[${operationId}] ${message}`, {
      statusCode: options?.statusCode ?? 500,
      code: 'LOADING_OPERATION_FAILED',
      domain: ErrorDomain.UI,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      recoverable: true,
      context: {
        operation: operationId,
        retryCount,
        ...options?.context,
      },
      cause: options?.cause,
    });
    this.name = 'LoadingOperationFailedError';
    this.operation = operationId;
    this.retryCount = retryCount;
  }
}

/**
 * Loading stage error - for errors at specific loading stages
 * 
 * @example
 * throw new LoadingStageError('data-fetch', 'Failed to fetch from API', {
 *   context: { stage: 'init' }
 * });
 */
export class LoadingStageError extends BaseError {
  public override readonly name: string;
  public readonly stage: string;

  constructor(
    stage: string,
    message: string,
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(`[${stage}] ${message}`, {
      statusCode: options?.statusCode ?? 400,
      code: 'LOADING_STAGE_ERROR',
      domain: ErrorDomain.UI,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoverable: true,
      context: {
        stage,
        ...options?.context,
      },
      cause: options?.cause,
    });
    this.name = 'LoadingStageError';
    this.stage = stage;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if error is a LoadingError
 */
export function isLoadingError(error: unknown): error is LoadingError {
  return error instanceof LoadingError;
}

/**
 * Type guard to check if error is a LoadingTimeoutError
 */
export function isTimeoutError(error: unknown): error is LoadingTimeoutError {
  return error instanceof LoadingTimeoutError;
}

/**
 * Type guard to check if error is a LoadingNetworkError
 */
export function isLoadingNetworkError(error: unknown): error is LoadingNetworkError {
  return error instanceof LoadingNetworkError;
}

/**
 * Type guard to check if error is a LoadingValidationError
 */
export function isLoadingValidationError(
  error: unknown
): error is LoadingValidationError {
  return error instanceof LoadingValidationError;
}

/**
 * Type guard to check if error is a LoadingOperationFailedError
 */
export function isLoadingOperationFailedError(
  error: unknown
): error is LoadingOperationFailedError {
  return error instanceof LoadingOperationFailedError;
}

/**
 * Type guard to check if error is a LoadingStageError
 */
export function isLoadingStageError(error: unknown): error is LoadingStageError {
  return error instanceof LoadingStageError;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if loading error is retryable
 */
export function isRetryableError(error: LoadingError): boolean {
  return error.retryable;
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: LoadingError): ErrorSeverity {
  return error.severity;
}

/**
 * Get suggested recovery strategies for error
 */
export function getErrorRecoveryStrategy(error: LoadingError): string[] {
  const strategies: string[] = [];

  if (error instanceof LoadingTimeoutError) {
    strategies.push('Increase timeout duration');
    strategies.push('Check network connection');
    strategies.push('Retry the operation');
  } else if (error instanceof LoadingNetworkError) {
    strategies.push('Check internet connection');
    strategies.push('Retry the operation');
    strategies.push('Contact support if problem persists');
  } else if (error instanceof LoadingValidationError) {
    strategies.push('Check data format');
    strategies.push('Contact support with error details');
  } else {
    strategies.push('Retry the operation');
    strategies.push('Check console for detailed error information');
  }

  return strategies;
}

/**
 * Format error message with context details
 */
export function formatErrorMessage(error: LoadingError): string {
  const baseMessage = error.message;
  const context = error.context;

  if (!context || Object.keys(context).length === 0) {
    return baseMessage;
  }

  const relevantDetails = Object.entries(context)
    .filter(([_key, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return relevantDetails ? `${baseMessage} (${relevantDetails})` : baseMessage;
}

/**
 * Get user-friendly error display message
 */
export function getErrorDisplayMessage(error: LoadingError): string {
  if (error instanceof LoadingTimeoutError) {
    return 'The operation is taking longer than expected. Please try again.';
  }
  if (error instanceof LoadingNetworkError) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  if (error instanceof LoadingValidationError) {
    return 'The received data is invalid. Please try again or contact support.';
  }
  return 'An error occurred during loading. Please try again.';
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: LoadingError): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    domain: error.domain,
    severity: error.severity,
    retryable: error.retryable,
    recoverable: error.recoverable,
    context: error.context,
    timestamp: error.timestamp,
    stack: error.stack,
    ...(error.cause ? { cause: error.cause } : {}),
  };
}

/**
 * Check if error should trigger retry logic
 */
export function shouldRetry(error: LoadingError, currentAttempt: number, maxAttempts: number): boolean {
  return error.retryable && currentAttempt < maxAttempts;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

/**
 * Create error from unknown error type
 */
export function normalizeError(error: unknown): LoadingError {
  if (error instanceof LoadingError) {
    return error;
  }

  if (error instanceof Error) {
    return new LoadingError(error.message, {
      cause: error,
      context: { originalError: error.name },
    });
  }

  return new LoadingError('An unknown error occurred', {
    context: { error: String(error) },
  });
}