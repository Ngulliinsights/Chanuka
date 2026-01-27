/**
 * Result and Option Types for Error Handling
 * Standardized error handling patterns across the application
 */

/**
 * Result type for operations that can fail
 * Eliminates need for throwing exceptions
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Option type for nullable values
 */
export type Option<T> = T | null;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Base application error
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly severity: ErrorSeverity;

  constructor(
    message: string,
    public readonly context?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Validation error
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    public readonly field?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends AppError {
  readonly code = 'BUSINESS_LOGIC_ERROR';
  readonly severity = 'high' as const;
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    entityType: string,
    identifier: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(`${entityType} with identifier '${identifier}' not found`, context);
  }
}

/**
 * Permission error
 */
export class PermissionError extends AppError {
  readonly code = 'PERMISSION_ERROR';
  readonly severity = 'high' as const;

  constructor(
    action: string,
    resource: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(`Permission denied for action '${action}' on resource '${resource}'`, context);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly severity = 'high' as const;

  constructor(
    message: string,
    public readonly authType?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly severity = 'critical' as const;

  constructor(
    message: string,
    public readonly operation?: string,
    public readonly query?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly severity = 'high' as const;

  constructor(
    message: string,
    public readonly configKey?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    public readonly limit?: number,
    public readonly remaining?: number,
    public readonly resetTime?: number,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Conflict error (for resource conflicts)
 */
export class ConflictError extends AppError {
  readonly code = 'CONFLICT_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  readonly code = 'TIMEOUT_ERROR';
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    public readonly timeout?: number,
    public readonly operation?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * System error (for unexpected system failures)
 */
export class SystemError extends AppError {
  readonly code = 'SYSTEM_ERROR';
  readonly severity = 'critical' as const;

  constructor(
    message: string,
    public readonly component?: string,
    public readonly originalError?: Error,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Utility functions for Result type
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guards for Result
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailure<T>(result: Result<T>): result is { success: false; error: Error } {
  return result.success === false;
}

/**
 * Error context utilities
 */
export interface ErrorContext {
  readonly timestamp: number;
  readonly userId: string | undefined;
  readonly sessionId: string | undefined;
  readonly requestId: string | undefined;
  readonly component: string | undefined;
  readonly method: string | undefined;
  readonly stackTrace: string | undefined;
  readonly additionalData: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Create standardized error context
 */
export function createErrorContext(options: {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  method?: string;
  additionalData?: Readonly<Record<string, unknown>>;
  stackTrace?: string;
}): ErrorContext {
  return {
    timestamp: Date.now(),
    userId: options.userId,
    sessionId: options.sessionId,
    requestId: options.requestId,
    component: options.component,
    method: options.method,
    stackTrace: options.stackTrace,
    additionalData: options.additionalData,
  };
}

/**
 * Enhance error with additional context
 */
export function enhanceErrorWithContext(
  error: AppError,
  additionalContext: Partial<ErrorContext>
): AppError {
  const currentContext = error.context ?? {};
  const newContext = { ...currentContext, ...additionalContext };

  // Create a new error instance with the enhanced context
  const EnhancedError = error.constructor as new (message: string, context?: Readonly<Record<string, unknown>>) => AppError;
  const enhancedError = new EnhancedError(error.message, newContext);

  // Copy stack for better debugging
  if (error.stack) {
    enhancedError.stack = error.stack;
  }

  return enhancedError;
}

/**
 * Extract error metadata for logging
 */
export function extractErrorMetadata(error: unknown): {
  code?: string | undefined;
  severity?: ErrorSeverity | undefined;
  message?: string;
  context?: Readonly<Record<string, unknown>> | undefined;
  stack?: string | undefined;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      severity: error.severity,
      message: error.message,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      code: undefined as string | undefined,
      severity: undefined as ErrorSeverity | undefined,
      message: error.message,
      context: undefined,
      stack: error.stack,
    };
  }

  return {
    code: undefined as string | undefined,
    severity: undefined as ErrorSeverity | undefined,
    message: String(error),
    context: undefined,
    stack: undefined,
  };
}

/**
 * Type guards for error types
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isBusinessLogicError(error: unknown): error is BusinessLogicError {
  return error instanceof BusinessLogicError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}

/**
 * Error severity guard
 */
export function isCriticalError(error: unknown): boolean {
  return isAppError(error) && error.severity === 'critical';
}

export function isHighSeverityError(error: unknown): boolean {
  return isAppError(error) && (error.severity === 'high' || error.severity === 'critical');
}

export function isMediumSeverityError(error: unknown): boolean {
  return isAppError(error) && error.severity === 'medium';
}

export function isLowSeverityError(error: unknown): boolean {
  return isAppError(error) && error.severity === 'low';
}

/**
 * Error handling utilities
 */
export function handleError(
  error: unknown,
  options: {
    onCritical?: (error: AppError) => void;
    onHigh?: (error: AppError) => void;
    onMedium?: (error: AppError) => void;
    onLow?: (error: AppError) => void;
    defaultHandler?: (error: unknown) => void;
  } = {}
): void {
  if (isAppError(error)) {
    switch (error.severity) {
      case 'critical':
        options.onCritical?.(error);
        break;
      case 'high':
        options.onHigh?.(error);
        break;
      case 'medium':
        options.onMedium?.(error);
        break;
      case 'low':
        options.onLow?.(error);
        break;
    }
  } else {
    options.defaultHandler?.(error);
  }
}

/**
 * Convert error to safe object for serialization
 */
export function errorToSafeObject(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Create error from safe object (deserialization)
 * Simplified approach that creates a generic AppError with the original code
 */
export function errorFromSafeObject(
  safeObject: Record<string, unknown>
): AppError | Error {
  if (safeObject.code && safeObject.severity && safeObject.message) {
    // Create a generic AppError with the original error code
    class ReconstructedError extends AppError {
      readonly code: string = safeObject.code as string;
      readonly severity: ErrorSeverity = safeObject.severity as ErrorSeverity;

      constructor() {
        super(safeObject.message as string, safeObject.context as Readonly<Record<string, unknown>>);
      }
    }

    const error = new ReconstructedError();
    if (safeObject.stack) {
      error.stack = safeObject.stack as string;
    }
    return error;
  }

  // Fallback to generic error
  const error = new Error(safeObject.message as string);
  if (safeObject.stack) {
    error.stack = safeObject.stack as string;
  }
  return error;
}