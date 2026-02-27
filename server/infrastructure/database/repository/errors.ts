/**
 * Repository Error Type Hierarchy
 * 
 * Provides comprehensive error types for repository operations with proper
 * categorization (transient, validation, fatal) and context preservation.
 * 
 * @module server/infrastructure/database/repository/errors
 */

/**
 * Base repository error class
 * All repository errors extend this class for consistent error handling
 */
export abstract class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes error for logging and API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Check if error should be retried
   */
  isRetryable(): boolean {
    return this instanceof TransientError;
  }

  /**
   * Check if error should be cached (for negative caching)
   */
  shouldCache(): boolean {
    return this instanceof NotFoundError;
  }

  /**
   * Get sanitized error message for production
   */
  getSanitizedMessage(): string {
    if (process.env.NODE_ENV === 'production') {
      // Return generic message in production
      return 'An error occurred while processing your request';
    }
    return this.message;
  }

  /**
   * Get error severity level
   */
  getSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    if (this instanceof FatalError) return 'critical';
    if (this instanceof ValidationError) return 'low';
    if (this instanceof TransientError) return 'medium';
    return 'high';
  }
}

/**
 * Transient errors that should trigger retries
 * These errors are temporary and may succeed on retry
 */
export class TransientError extends RepositoryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TRANSIENT_ERROR', context);
  }
}

/**
 * Validation errors from business rules or constraints
 * These errors indicate invalid input or business rule violations
 */
export class ValidationError extends RepositoryError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { ...context, field });
  }
}

/**
 * Fatal errors that should not be retried
 * These errors indicate programming errors or unrecoverable conditions
 */
export class FatalError extends RepositoryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FATAL_ERROR', context);
  }
}

/**
 * Constraint violation errors (unique, foreign key, check)
 * Extends ValidationError with specific constraint type information
 */
export class ConstraintError extends ValidationError {
  constructor(
    message: string,
    public readonly constraintType: 'unique' | 'foreign_key' | 'check',
    field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, field, { ...context, constraintType });
    // Override code by creating new property (not ideal but works)
    Object.defineProperty(this, 'code', {
      value: 'CONSTRAINT_ERROR',
      writable: false,
      enumerable: true,
      configurable: false
    });
  }
}

/**
 * Not found errors
 * Indicates requested entity does not exist
 */
export class NotFoundError extends RepositoryError {
  constructor(
    entityName: string,
    identifier: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${entityName} not found: ${identifier}`,
      'NOT_FOUND',
      { ...context, entityName, identifier }
    );
  }
}

/**
 * Timeout errors
 * Extends TransientError as timeouts may succeed on retry
 */
export class TimeoutError extends TransientError {
  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      { ...context, operation, timeoutMs }
    );
    // Override code by creating new property
    Object.defineProperty(this, 'code', {
      value: 'TIMEOUT_ERROR',
      writable: false,
      enumerable: true,
      configurable: false
    });
  }
}

/**
 * Type guard to check if error is a RepositoryError
 */
export function isRepositoryError(error: unknown): error is RepositoryError {
  return error instanceof RepositoryError;
}

/**
 * Type guard to check if error is transient (retryable)
 */
export function isTransientError(error: unknown): error is TransientError {
  return error instanceof TransientError;
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a fatal error
 */
export function isFatalError(error: unknown): error is FatalError {
  return error instanceof FatalError;
}

/**
 * Type guard to check if error is a constraint error
 */
export function isConstraintError(error: unknown): error is ConstraintError {
  return error instanceof ConstraintError;
}

/**
 * Type guard to check if error is a not found error
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Helper to categorize database errors
 * Converts database-specific errors into repository error types
 */
export function categorizeError(error: unknown, entityName?: string, operation?: string): RepositoryError {
  // Already a repository error
  if (isRepositoryError(error)) {
    return error;
  }

  // Convert Error to RepositoryError
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const context = { entityName, operation, originalError: error.message };

    // Detect constraint violations
    if (message.includes('unique constraint') || message.includes('duplicate key')) {
      return new ConstraintError(
        error.message,
        'unique',
        undefined,
        context
      );
    }

    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return new ConstraintError(
        error.message,
        'foreign_key',
        undefined,
        context
      );
    }

    if (message.includes('check constraint')) {
      return new ConstraintError(
        error.message,
        'check',
        undefined,
        context
      );
    }

    // Detect transient errors
    if (
      message.includes('deadlock') ||
      message.includes('lock timeout') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return new TransientError(error.message, context);
    }

    // Default to fatal error
    return new FatalError(error.message, context);
  }

  // Unknown error type
  return new FatalError(String(error), { entityName, operation });
}

/**
 * Helper to extract field name from constraint error message
 */
export function extractFieldFromConstraintError(error: Error): string | undefined {
  const message = error.message;
  
  // Try to extract field name from common patterns
  const patterns = [
    /Key \(([^)]+)\)/,           // PostgreSQL: Key (email)
    /column "([^"]+)"/,          // column "email"
    /field '([^']+)'/,           // field 'email'
    /constraint "([^"]+)"/,      // constraint "users_email_key"
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}
