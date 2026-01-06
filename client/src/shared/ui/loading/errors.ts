/**
 * Loading-specific error types - SIMPLIFIED
 * Core error classes only
 */

export enum LoadingErrorType {
  LOADING_ERROR = 'LOADING_ERROR',
  LOADING_TIMEOUT = 'LOADING_TIMEOUT',
}

export class LoadingError extends Error {
  public readonly type: LoadingErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: LoadingErrorType = LoadingErrorType.LOADING_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LoadingError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LoadingError);
    }
  }
}

export class LoadingTimeoutError extends LoadingError {
  constructor(operationId: string, timeout: number, details?: Record<string, any>) {
    super(
      `Loading operation timed out after ${timeout}ms: ${operationId}`,
      LoadingErrorType.LOADING_TIMEOUT,
      408,
      { operationId, timeout, ...details }
    );
  }
}

/**
 * Error utility functions
 */

export function isLoadingError(error: unknown): error is LoadingError {
  return error instanceof LoadingError;
}

export function isTimeoutError(error: unknown): error is LoadingTimeoutError {
  return error instanceof LoadingTimeoutError;
}

/**
 * Error classification helpers
 */

export function isRetryableError(error: LoadingError): boolean {
  return error.type === LoadingErrorType.LOADING_TIMEOUT;
}

export function getErrorSeverity(error: LoadingError): 'low' | 'medium' | 'high' {
  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
      return 'medium';
    default:
      return 'medium';
  }
}

export function getErrorRecoveryStrategy(error: LoadingError): string[] {
  const strategies: string[] = [];

  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
      strategies.push('Increase timeout duration');
      strategies.push('Check network connection');
      strategies.push('Retry the operation');
      break;

    default:
      strategies.push('Retry the operation');
      strategies.push('Check console for detailed error information');
      break;
  }

  return strategies;
}

/**
 * Error formatting utilities
 */

export function formatErrorMessage(error: LoadingError): string {
  const baseMessage = error.message;
  const details = error.details;

  if (!details || Object.keys(details).length === 0) {
    return baseMessage;
  }

  const relevantDetails = Object.entries(details)
    .filter(([_key, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return relevantDetails ? `${baseMessage} (${relevantDetails})` : baseMessage;
}

export function getErrorDisplayMessage(error: LoadingError): string {
  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
      return 'The operation is taking longer than expected. Please try again.';

    default:
      return 'An error occurred during loading. Please try again.';
  }
}

export class LoadingNetworkError extends LoadingError {
  constructor(message: string) {
    super(message, LoadingErrorType.LOADING_ERROR, 500);
    this.name = 'LoadingNetworkError';
  }
}

export class LoadingValidationError extends LoadingError {
  constructor(message: string) {
    super(message, LoadingErrorType.LOADING_ERROR, 400);
    this.name = 'LoadingValidationError';
  }
}

export class LoadingOperationFailedError extends LoadingError {
  constructor(operationId: string, message: string, retryCount?: number) {
    super(`Operation failed: ${message}`, LoadingErrorType.LOADING_ERROR, 500, {
      operationId,
      retryCount,
    });
    this.name = 'LoadingOperationFailedError';
  }
}

export class LoadingStageError extends LoadingError {
  constructor(stage: string, message: string, details?: Record<string, any>) {
    super(`Stage error in ${stage}: ${message}`, LoadingErrorType.LOADING_ERROR, 400, {
      stage,
      ...details,
    });
    this.name = 'LoadingStageError';
  }
}
