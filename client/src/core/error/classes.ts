/**
 * Error Classes Module
 *
 * Comprehensive error class implementations migrated from utils/errors.ts
 * with enhanced modular architecture and full feature parity.
 */

import { ErrorDomain, ErrorSeverity } from './constants';
import { ErrorContext, ErrorMetadata, NavigationErrorType } from './types';

// ============================================================================
// BASE ERROR CLASSES (Migrated from utils/errors.ts)
// ============================================================================

/**
 * Base error class that all application errors extend from. Provides rich
 * metadata, automatic logging, and serialization capabilities.
 */
export class BaseError extends Error {
  public readonly errorId: string;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly domain: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly recoverable: boolean;
  public readonly context?: ErrorContext;
  public readonly metadata: ErrorMetadata;
  public readonly cause?: Error | unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      domain?: ErrorDomain;
      severity?: ErrorSeverity;
      retryable?: boolean;
      recoverable?: boolean;
      context?: ErrorContext;
      correlationId?: string;
      cause?: Error | unknown;
    } = {}
  ) {
    super(message);

    // Set error name to constructor name for better stack traces
    this.name = this.constructor.name;

    // Generate unique error identifier
    this.errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Initialize error properties with sensible defaults
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.domain = options.domain ?? ErrorDomain.SYSTEM;
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.retryable = options.retryable ?? false;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context;
    this.cause = options.cause;
    this.timestamp = new Date();

    // Build comprehensive metadata object
    this.metadata = {
      domain: this.domain,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      retryable: this.retryable,
      recoverable: this.recoverable,
      correlationId: options.correlationId,
      cause: this.cause,
      code: this.code,
    };

    // Capture stack trace for better debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Automatically log the error based on severity
    this.logError();
  }

  /**
   * Logs the error using the appropriate logging level based on severity
   */
  private logError(): void {
    const logData = {
      component: 'BaseError',
      errorId: this.errorId,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      retryable: this.retryable,
      recoverable: this.recoverable,
      context: this.context,
    };

    // Route to appropriate log level based on severity
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(this.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(this.message, logData);
        break;
      case ErrorSeverity.LOW:
        console.info(this.message, logData);
        break;
    }
  }

  /**
   * Serializes error to JSON for API responses and logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      domain: this.domain,
      severity: this.severity,
      errorId: this.errorId,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Creates a new error instance with additional context merged in.
   * Useful for adding context as error bubbles up the call stack.
   */
  withContext(additionalContext: Partial<ErrorContext>): this {
    const newContext = { ...this.context, ...additionalContext };
    return new (this.constructor as new (...args: unknown[]) => this)(this.message, {
      ...this,
      context: newContext,
    });
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public details?: Record<string, string[]>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: false,
      context,
    });
  }
}

/**
 * Network error for connection and HTTP failures
 */
export class NetworkError extends BaseError {
  constructor(message: string = 'Network error', context?: ErrorContext) {
    super(message, {
      statusCode: 0,
      code: 'NETWORK_ERROR',
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoverable: true,
      context,
    });
  }
}

/**
 * Authentication error for unauthorized access
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', context?: ErrorContext) {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      recoverable: true,
      context,
    });
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource', context?: ErrorContext) {
    super(`${resource} not found`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      domain: ErrorDomain.EXTERNAL_SERVICE,
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoverable: false,
      context,
    });
  }
}

/**
 * Cache error for caching system failures
 */
export class CacheError extends BaseError {
  constructor(message: string = 'Cache error', context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'CACHE_ERROR',
      domain: ErrorDomain.CACHE,
      severity: ErrorSeverity.LOW,
      retryable: true,
      recoverable: true,
      context,
    });
  }
}

// ============================================================================
// NAVIGATION ERROR CLASSES (Migrated from utils/errors.ts)
// ============================================================================

/**
 * Base class for navigation-related errors
 */
export class NavigationError extends BaseError {
  public readonly type: NavigationErrorType;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: NavigationErrorType = NavigationErrorType.NAVIGATION_ERROR,
    statusCode: number = 400,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode,
      code: type,
      domain: ErrorDomain.SYSTEM, // Navigation is part of system domain
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: false,
      context,
    });
    this.type = type;
    this.details = details;
    this.isOperational = true;
  }
}

export class NavigationItemNotFoundError extends NavigationError {
  constructor(path: string, details?: Record<string, unknown>, context?: ErrorContext) {
    super(
      `Navigation item not found for path: ${path}`,
      NavigationErrorType.NAVIGATION_ITEM_NOT_FOUND,
      404,
      { path, ...details },
      context
    );
  }
}

export class InvalidNavigationPathError extends NavigationError {
  constructor(
    path: string,
    reason?: string,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(
      reason ?? `Invalid navigation path: ${path}`,
      NavigationErrorType.INVALID_NAVIGATION_PATH,
      400,
      { path, reason, ...details },
      context
    );
  }
}

export class NavigationAccessDeniedError extends NavigationError {
  constructor(
    path: string,
    reason: string,
    requiredRole?: string[],
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(
      `Access denied to navigation path: ${path} - ${reason}`,
      NavigationErrorType.NAVIGATION_ACCESS_DENIED,
      403,
      { path, reason, requiredRole, ...details },
      context
    );
  }
}

export class NavigationValidationError extends NavigationError {
  constructor(
    message: string,
    field: string,
    value: unknown,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(
      message,
      NavigationErrorType.NAVIGATION_VALIDATION_ERROR,
      422,
      { field, value, ...details },
      context
    );
  }
}

export class NavigationConfigurationError extends NavigationError {
  constructor(message: string, details?: Record<string, unknown>, context?: ErrorContext) {
    super(message, NavigationErrorType.NAVIGATION_CONFIGURATION_ERROR, 500, details, context);
  }
}
