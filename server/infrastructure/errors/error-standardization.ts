// ============================================================================
// ERROR STANDARDIZATION SYSTEM
// ============================================================================
// Provides consistent error handling patterns across all services

import { logger } from '@server/infrastructure/observability';

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  user_id?: string;
  requestId?: string;
  correlationId?: string;
  service: string;
  operation: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StandardizedError {
  id: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: ErrorContext;
  originalError?: Error;
  stackTrace?: string;
  retryable: boolean;
  httpStatusCode: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    id: string;
    code: string;
    message: string;
    category: string;
    retryable: boolean;
    timestamp: string;
  };
  metadata: {
    requestId?: string;
    correlationId?: string;
    service: string;
  };
}

/**
 * Standardized Error Handler
 * 
 * Provides consistent error handling, logging, and response formatting
 * across all services in the platform.
 */
export class StandardizedErrorHandler {
  private static instance: StandardizedErrorHandler;
  private errorCounts = new Map<string, number>();
  private readonly MAX_ERROR_HISTORY = 1000;

  static getInstance(): StandardizedErrorHandler {
    if (!StandardizedErrorHandler.instance) {
      StandardizedErrorHandler.instance = new StandardizedErrorHandler();
    }
    return StandardizedErrorHandler.instance;
  }

  /**
   * Create a standardized error from various input types
   */
  createError(
    error: Error | string,
    category: ErrorCategory,
    context: Partial<ErrorContext>,
    options: {
      code?: string;
      severity?: ErrorSeverity;
      userMessage?: string;
      retryable?: boolean;
      httpStatusCode?: number;
    } = {}
  ): StandardizedError {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const originalError = error instanceof Error ? error : new Error(error);
    const message = originalError.message;
    
    const standardizedError: StandardizedError = {
      id: errorId,
      code: options.code || this.generateErrorCode(category, context.service || 'unknown'),
      category,
      severity: options.severity || this.determineSeverity(category),
      message,
      userMessage: options.userMessage || this.generateUserMessage(category),
      context: {
        service: 'unknown',
        operation: 'unknown',
        timestamp,
        ...context
      },
      originalError,
      ...(originalError.stack && { stackTrace: originalError.stack }),
      retryable: options.retryable ?? this.isRetryable(category, originalError),
      httpStatusCode: options.httpStatusCode || this.getHttpStatusCode(category)
    };

    // Log the error
    this.logError(standardizedError);
    
    // Track error frequency
    this.trackErrorFrequency(standardizedError.code);

    return standardizedError;
  }

  /**
   * Handle validation errors with detailed field information
   */
  createValidationError(
    validationErrors: Array<{ field: string; message: string; value?: any }>,
    context: Partial<ErrorContext>
  ): StandardizedError {
    const message = `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
    
    return this.createError(
      message,
      ErrorCategory.VALIDATION,
      context,
      {
        code: 'VALIDATION_FAILED',
        severity: ErrorSeverity.LOW,
        userMessage: 'Please check your input and try again.',
        retryable: false,
        httpStatusCode: 400
      }
    );
  }

  /**
   * Handle authentication errors
   */
  createAuthenticationError(
    reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
    context: Partial<ErrorContext>
  ): StandardizedError {
    const messages = {
      invalid_token: 'Invalid authentication token',
      expired_token: 'Authentication token has expired',
      missing_token: 'Authentication token is required',
      invalid_credentials: 'Invalid username or password'
    };

    return this.createError(
      messages[reason],
      ErrorCategory.AUTHENTICATION,
      context,
      {
        code: `AUTH_${reason.toUpperCase()}`,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Please log in again to continue.',
        retryable: false,
        httpStatusCode: 401
      }
    );
  }

  /**
   * Handle authorization errors
   */
  createAuthorizationError(
    resource: string,
    action: string,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `Access denied: insufficient permissions to ${action} ${resource}`,
      ErrorCategory.AUTHORIZATION,
      context,
      {
        code: 'ACCESS_DENIED',
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'You do not have permission to perform this action.',
        retryable: false,
        httpStatusCode: 403
      }
    );
  }

  /**
   * Handle not found errors
   */
  createNotFoundError(
    resource: string,
    identifier: string,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `${resource} not found: ${identifier}`,
      ErrorCategory.NOT_FOUND,
      context,
      {
        code: 'RESOURCE_NOT_FOUND',
        severity: ErrorSeverity.LOW,
        userMessage: 'The requested resource could not be found.',
        retryable: false,
        httpStatusCode: 404
      }
    );
  }

  /**
   * Handle conflict errors (e.g., duplicate resources)
   */
  createConflictError(
    resource: string,
    reason: string,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `Conflict with ${resource}: ${reason}`,
      ErrorCategory.CONFLICT,
      context,
      {
        code: 'RESOURCE_CONFLICT',
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'This action conflicts with existing data. Please check and try again.',
        retryable: false,
        httpStatusCode: 409
      }
    );
  }

  /**
   * Handle rate limiting errors
   */
  createRateLimitError(
    limit: number,
    window: string,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      ErrorCategory.RATE_LIMIT,
      context,
      {
        code: 'RATE_LIMIT_EXCEEDED',
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
        httpStatusCode: 429
      }
    );
  }

  /**
   * Handle external service errors
   */
  createExternalServiceError(
    serviceName: string,
    originalError: Error,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `External service error from ${serviceName}: ${originalError.message}`,
      ErrorCategory.EXTERNAL_SERVICE,
      context,
      {
        code: 'EXTERNAL_SERVICE_ERROR',
        severity: ErrorSeverity.HIGH,
        userMessage: 'A required service is temporarily unavailable. Please try again later.',
        retryable: true,
        httpStatusCode: 503
      }
    );
  }

  /**
   * Handle database errors
   */
  createDatabaseError(
    operation: string,
    originalError: Error,
    context: Partial<ErrorContext>
  ): StandardizedError {
    const isConnectionError = originalError.message.includes('connection') || 
                             originalError.message.includes('timeout');
    
    return this.createError(
      `Database error during ${operation}: ${originalError.message}`,
      ErrorCategory.DATABASE,
      context,
      {
        code: isConnectionError ? 'DATABASE_CONNECTION_ERROR' : 'DATABASE_OPERATION_ERROR',
        severity: isConnectionError ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
        userMessage: 'A database error occurred. Please try again later.',
        retryable: isConnectionError,
        httpStatusCode: 500
      }
    );
  }

  /**
   * Handle business logic errors
   */
  createBusinessLogicError(
    rule: string,
    details: string,
    context: Partial<ErrorContext>
  ): StandardizedError {
    return this.createError(
      `Business rule violation: ${rule} - ${details}`,
      ErrorCategory.BUSINESS_LOGIC,
      context,
      {
        code: 'BUSINESS_RULE_VIOLATION',
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'This action violates business rules. Please check your input.',
        retryable: false,
        httpStatusCode: 400
      }
    );
  }

  /**
   * Convert standardized error to HTTP response format
   */
  toErrorResponse(error: StandardizedError): ErrorResponse {
    return {
      success: false,
      error: {
        id: error.id,
        code: error.code,
        message: error.userMessage,
        category: error.category,
        retryable: error.retryable,
        timestamp: error.context.timestamp.toISOString()
      },
      metadata: {
        ...(error.context.requestId && { requestId: error.context.requestId }),
        ...(error.context.correlationId && { correlationId: error.context.correlationId }),
        service: error.context.service
      }
    };
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrorCodes: Array<{ code: string; count: number }>;
    errorRate: number;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // This would be enhanced with actual categorization in a real implementation
    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = 0;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const topErrorCodes = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      topErrorCodes,
      errorRate: totalErrors / Math.max(1, this.MAX_ERROR_HISTORY) // Simplified calculation
    };
  }

  /**
   * Check if an error should trigger an alert
   */
  shouldAlert(error: StandardizedError): boolean {
    // Alert on critical errors or high frequency of the same error
    if (error.severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    const errorCount = this.errorCounts.get(error.code) || 0;
    if (errorCount > 10) { // More than 10 occurrences
      return true;
    }

    return false;
  }

  // Private helper methods

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorCode(category: ErrorCategory, service: string): string {
    const categoryCode = category.toUpperCase().replace('_', '');
    const serviceCode = service.toUpperCase().substr(0, 3);
    const timestamp = Date.now().toString().substr(-6);
    return `${categoryCode}_${serviceCode}_${timestamp}`;
  }

  private determineSeverity(category: ErrorCategory): ErrorSeverity {
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

  private generateUserMessage(category: ErrorCategory): string {
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

    return userMessages[category] || 'An error occurred. Please try again.';
  }

  private isRetryable(category: ErrorCategory, error: Error): boolean {
    const retryableCategories = [
      ErrorCategory.RATE_LIMIT,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.DATABASE
    ];

    if (retryableCategories.includes(category)) {
      // Check if it's a connection/timeout error
      const errorMessage = error.message.toLowerCase();
      return errorMessage.includes('timeout') || 
             errorMessage.includes('connection') ||
             errorMessage.includes('network') ||
             errorMessage.includes('unavailable');
    }

    return false;
  }

  private getHttpStatusCode(category: ErrorCategory): number {
    const statusCodes = {
      [ErrorCategory.VALIDATION]: 400,
      [ErrorCategory.AUTHENTICATION]: 401,
      [ErrorCategory.AUTHORIZATION]: 403,
      [ErrorCategory.NOT_FOUND]: 404,
      [ErrorCategory.CONFLICT]: 409,
      [ErrorCategory.RATE_LIMIT]: 429,
      [ErrorCategory.EXTERNAL_SERVICE]: 503,
      [ErrorCategory.DATABASE]: 500,
      [ErrorCategory.BUSINESS_LOGIC]: 400,
      [ErrorCategory.SYSTEM]: 500
    };

    return statusCodes[category] || 500;
  }

  private logError(error: StandardizedError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      errorId: error.id,
      code: error.code,
      category: error.category,
      severity: error.severity,
      service: error.context.service,
      operation: error.context.operation,
      user_id: error.context.user_id,
      requestId: error.context.requestId,
      correlationId: error.context.correlationId,
      retryable: error.retryable,
      httpStatusCode: error.httpStatusCode,
      metadata: error.context.metadata
    };

    switch (logLevel) {
      case 'error':
        logger.error(error.message, logData, error.originalError);
        break;
      case 'warn':
        logger.warn(error.message, logData);
        break;
      case 'info':
        logger.info(error.message, logData);
        break;
      default:
        logger.debug(error.message, logData);
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

  private trackErrorFrequency(errorCode: string): void {
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);

    // Prevent memory leaks by limiting error history
    if (this.errorCounts.size > this.MAX_ERROR_HISTORY) {
      const oldestKey = this.errorCounts.keys().next().value;
      this.errorCounts.delete(oldestKey);
    }
  }
}

// Export singleton instance and convenience functions
export const errorHandler = StandardizedErrorHandler.getInstance();

// Convenience functions for common error types
export const createValidationError = (
  validationErrors: Array<{ field: string; message: string; value?: any }>,
  context: Partial<ErrorContext>
) => errorHandler.createValidationError(validationErrors, context);

export const createAuthenticationError = (
  reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
  context: Partial<ErrorContext>
) => errorHandler.createAuthenticationError(reason, context);

export const createAuthorizationError = (
  resource: string,
  action: string,
  context: Partial<ErrorContext>
) => errorHandler.createAuthorizationError(resource, action, context);

export const createNotFoundError = (
  resource: string,
  identifier: string,
  context: Partial<ErrorContext>
) => errorHandler.createNotFoundError(resource, identifier, context);

export const createBusinessLogicError = (
  rule: string,
  details: string,
  context: Partial<ErrorContext>
) => errorHandler.createBusinessLogicError(rule, details, context);
