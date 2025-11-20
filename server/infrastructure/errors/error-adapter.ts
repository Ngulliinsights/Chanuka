// ============================================================================
// ERROR ADAPTER FOR BOOM + NEVERTHROW MIGRATION
// ============================================================================
// Provides compatibility layer between new Boom/Neverthrow implementation
// and existing error response format

import Boom from '@hapi/boom';
import { Result, ok, err } from 'neverthrow';
import { logger  } from '@shared/core/src/index.js';
import { 
  ErrorCategory, 
  ErrorSeverity, 
  ErrorContext, 
  ErrorResponse,
  StandardizedError 
} from './error-standardization.js';

/**
 * Error Adapter that bridges Boom errors with existing error response format
 * Maintains API compatibility while using proven libraries internally
 */
export class ErrorAdapter {
  private static instance: ErrorAdapter;
  private errorCounts = new Map<string, number>();
  private readonly MAX_ERROR_HISTORY = 1000;

  constructor() {
    // Public constructor for testing purposes
  }

  static getInstance(): ErrorAdapter {
    if (!ErrorAdapter.instance) {
      ErrorAdapter.instance = new ErrorAdapter();
    }
    return ErrorAdapter.instance;
  }

  /**
   * Create validation error using Boom
   */
  createValidationError(
    validationErrors: Array<{ field: string; message: string; value?: any }>,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
    
    const boomError = Boom.badRequest(message);
    boomError.data = {
      validationErrors,
      category: ErrorCategory.VALIDATION,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create authentication error using Boom
   */
  createAuthenticationError(
    reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const messages = {
      invalid_token: 'Invalid authentication token',
      expired_token: 'Authentication token has expired',
      missing_token: 'Authentication token is required',
      invalid_credentials: 'Invalid username or password'
    };

    const boomError = Boom.unauthorized(messages[reason]);
    boomError.data = {
      reason,
      category: ErrorCategory.AUTHENTICATION,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create authorization error using Boom
   */
  createAuthorizationError(
    resource: string,
    action: string,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Access denied: insufficient permissions to ${action} ${resource}`;
    
    const boomError = Boom.forbidden(message);
    boomError.data = {
      resource,
      action,
      category: ErrorCategory.AUTHORIZATION,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create not found error using Boom
   */
  createNotFoundError(
    resource: string,
    identifier: string,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `${resource} not found: ${identifier}`;
    
    const boomError = Boom.notFound(message);
    boomError.data = {
      resource,
      identifier,
      category: ErrorCategory.NOT_FOUND,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create conflict error using Boom
   */
  createConflictError(
    resource: string,
    reason: string,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Conflict with ${resource}: ${reason}`;
    
    const boomError = Boom.conflict(message);
    boomError.data = {
      resource,
      reason,
      category: ErrorCategory.CONFLICT,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create rate limit error using Boom
   */
  createRateLimitError(
    limit: number,
    window: string,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Rate limit exceeded: ${limit} requests per ${window}`;
    
    const boomError = Boom.tooManyRequests(message);
    boomError.data = {
      limit,
      window,
      category: ErrorCategory.RATE_LIMIT,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: true
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create external service error using Boom
   */
  createExternalServiceError(
    serviceName: string,
    originalError: Error,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `External service error from ${serviceName}: ${originalError.message}`;
    
    const boomError = Boom.badGateway(message);
    boomError.data = {
      serviceName,
      originalError: originalError.message,
      category: ErrorCategory.EXTERNAL_SERVICE,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: true
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create database error using Boom
   */
  createDatabaseError(
    operation: string,
    originalError: Error,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Database error during ${operation}: ${originalError.message}`;
    const isConnectionError = originalError.message.includes('connection') || 
                             originalError.message.includes('timeout');
    
    const boomError = Boom.internal(message);
    boomError.data = {
      operation,
      originalError: originalError.message,
      isConnectionError,
      category: ErrorCategory.DATABASE,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: isConnectionError
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Create business logic error using Boom
   */
  createBusinessLogicError(
    rule: string,
    details: string,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Business rule violation: ${rule} - ${details}`;
    
    const boomError = Boom.badRequest(message);
    boomError.data = {
      rule,
      details,
      category: ErrorCategory.BUSINESS_LOGIC,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  /**
   * Convert Boom error to existing ErrorResponse format
   * This maintains API compatibility with existing clients
   */
  toErrorResponse(boomError: Boom.Boom): ErrorResponse {
    const data = boomError.data || {};
    const context = data.context || {};
    const category = data.category || ErrorCategory.SYSTEM;
    const errorId = data.errorId || this.generateErrorId();
    const retryable = data.retryable || false;

    return {
      success: false,
      error: {
        id: errorId,
        code: this.mapBoomToErrorCode(boomError, category),
        message: this.getUserMessage(boomError, category),
        category: category,
        retryable: retryable,
        timestamp: new Date().toISOString()
      },
      metadata: {
        ...(context.requestId && { requestId: context.requestId }),
        ...(context.correlationId && { correlationId: context.correlationId }),
        service: context.service || 'legislative-platform'
      }
    };
  }

  /**
   * Convert Boom error to StandardizedError format for backward compatibility
   */
  toStandardizedError(boomError: Boom.Boom): StandardizedError {
    const data = boomError.data || {};
    const context = data.context || {};
    const category = data.category || ErrorCategory.SYSTEM;
    const errorId = data.errorId || this.generateErrorId();

    return {
      id: errorId,
      code: this.mapBoomToErrorCode(boomError, category),
      category: category,
      severity: this.mapCategoryToSeverity(category),
      message: boomError.message,
      userMessage: this.getUserMessage(boomError, category),
      context: {
        service: 'legislative-platform',
        operation: 'unknown',
        timestamp: new Date(),
        ...context
      },
      originalError: new Error(boomError.message),
      stackTrace: boomError.stack,
      retryable: data.retryable || false,
      httpStatusCode: boomError.output.statusCode
    };
  }

  /**
   * Wrap a function to return Result type
   */
  wrapFunction<T, E = Boom.Boom>(
    fn: () => T | Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    return Promise.resolve()
      .then(() => fn())
      .then(result => ok(result))
      .catch(error => {
        if (errorMapper) {
          return err(errorMapper(error));
        }
        
        // Default error mapping to Boom
        if (Boom.isBoom(error)) {
          return err(error as E);
        }
        
        const boomError = Boom.internal(
          error instanceof Error ? error.message : String(error)
        );
        boomError.data = {
          originalError: error,
          category: ErrorCategory.SYSTEM,
          context: this.buildContext({}),
          errorId: this.generateErrorId(),
          retryable: false
        };
        
        this.trackError(boomError);
        return err(boomError as E);
      });
  }

  /**
   * Check if error should trigger alert (maintains existing logic)
   */
  shouldAlert(boomError: Boom.Boom): boolean {
    const data = boomError.data || {};
    const category = data.category || ErrorCategory.SYSTEM;
    
    // Alert on critical errors or high frequency
    if (this.mapCategoryToSeverity(category) === ErrorSeverity.CRITICAL) {
      return true;
    }

    const errorCode = this.mapBoomToErrorCode(boomError, category);
    const errorCount = this.errorCounts.get(errorCode) || 0;
    
    return errorCount > 10;
  }

  // Private helper methods

  private buildContext(context: Partial<ErrorContext>): ErrorContext {
    return {
      service: 'legislative-platform',
      operation: 'unknown',
      timestamp: new Date(),
      ...context
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapBoomToErrorCode(boomError: Boom.Boom, category: ErrorCategory): string {
    const statusCode = boomError.output.statusCode;
    const categoryCode = category.toUpperCase().replace('_', '');
    
    // Map common Boom status codes to error codes
    const statusCodeMap: Record<number, string> = {
      400: 'VALIDATION_FAILED',
      401: 'AUTH_INVALID_TOKEN',
      403: 'ACCESS_DENIED',
      404: 'RESOURCE_NOT_FOUND',
      409: 'RESOURCE_CONFLICT',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'EXTERNAL_SERVICE_ERROR',
      503: 'SERVICE_UNAVAILABLE'
    };

    return statusCodeMap[statusCode] || `${categoryCode}_ERROR`;
  }

  private getUserMessage(boomError: Boom.Boom, category: ErrorCategory): string {
    // Use existing user message mapping
    const userMessages = {
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorCategory.NOT_FOUND]: 'The requested resource could not be found.',
      [ErrorCategory.CONFLICT]: 'This action conflicts with existing data.',
      [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait and try again.',
      [ErrorCategory.EXTERNAL_SERVICE]: 'A required service is temporarily unavailable.',
      [ErrorCategory.DATABASE]: 'A system error occurred. Please try again later.',
      [ErrorCategory.BUSINESS_LOGIC]: 'This action is not allowed by business rules.',
      [ErrorCategory.SYSTEM]: 'A system error occurred. Please contact support.'
    };

    // If category is not found in data, try to infer from status code
    if (!category) {
      const statusCode = boomError.output.statusCode;
      if (statusCode === 401) return userMessages[ErrorCategory.AUTHENTICATION];
      if (statusCode === 403) return userMessages[ErrorCategory.AUTHORIZATION];
      if (statusCode === 404) return userMessages[ErrorCategory.NOT_FOUND];
      if (statusCode === 400) return userMessages[ErrorCategory.VALIDATION];
    }

    return userMessages[category] || 'An error occurred. Please try again.';
  }

  private mapCategoryToSeverity(category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.NOT_FOUND:
        return ErrorSeverity.LOW;
      
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.CONFLICT:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.BUSINESS_LOGIC:
        return ErrorSeverity.MEDIUM;
      
      case ErrorCategory.DATABASE:
      case ErrorCategory.EXTERNAL_SERVICE:
        return ErrorSeverity.HIGH;
      
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private trackError(boomError: Boom.Boom): void {
    const data = boomError.data || {};
    const category = data.category || ErrorCategory.SYSTEM;
    const errorCode = this.mapBoomToErrorCode(boomError, category);
    
    // Track error frequency
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);

    // Prevent memory leaks
    if (this.errorCounts.size > this.MAX_ERROR_HISTORY) {
      const oldestKey = this.errorCounts.keys().next().value;
      this.errorCounts.delete(oldestKey);
    }

    // Log the error
    this.logError(boomError, category);
  }

  private logError(boomError: Boom.Boom, category: ErrorCategory): void {
    const data = boomError.data || {};
    const context = data.context || {};
    const severity = this.mapCategoryToSeverity(category);
    
    const logData = {
      errorId: data.errorId,
      code: this.mapBoomToErrorCode(boomError, category),
      category: category,
      severity: severity,
      service: context.service || 'legislative-platform',
      operation: context.operation || 'unknown',
      user_id: context.user_id,
      requestId: context.requestId,
      correlationId: context.correlationId,
      retryable: data.retryable || false,
      httpStatusCode: boomError.output.statusCode,
      metadata: context.metadata
    };

    const logLevel = this.getLogLevel(severity);
    
    switch (logLevel) {
      case 'error':
        logger.error(boomError.message, logData, boomError);
        break;
      case 'warn':
        logger.warn(boomError.message, logData);
        break;
      case 'info':
        logger.info(boomError.message, logData);
        break;
      default:
        logger.debug(boomError.message, logData);
    }
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }
}

// Export singleton instance and convenience functions
export const errorAdapter = ErrorAdapter.getInstance();

// Convenience functions that return Result types
export const createValidationError = (
  validationErrors: Array<{ field: string; message: string; value?: any }>,
  context: Partial<ErrorContext>
) => errorAdapter.createValidationError(validationErrors, context);

export const createAuthenticationError = (
  reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
  context: Partial<ErrorContext>
) => errorAdapter.createAuthenticationError(reason, context);

export const createAuthorizationError = (
  resource: string,
  action: string,
  context: Partial<ErrorContext>
) => errorAdapter.createAuthorizationError(resource, action, context);

export const createNotFoundError = (
  resource: string,
  identifier: string,
  context: Partial<ErrorContext>
) => errorAdapter.createNotFoundError(resource, identifier, context);

export const createBusinessLogicError = (
  rule: string,
  details: string,
  context: Partial<ErrorContext>
) => errorAdapter.createBusinessLogicError(rule, details, context);