/**
 * Legacy Error Handling Adapters
 * 
 * Adapters to integrate existing error handling implementations with the core error handling system
 */

import { AppError } from '../errors';

/**
 * Legacy error classes that need to be migrated
 */
export class LegacyAppError extends Error {
  public statusCode: number;
  public code: string;
  public category: string;
  public details?: Record<string, unknown>;
  public correlationId?: string;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    category: string = 'SYSTEM',
    details?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.details = details;
    this.correlationId = correlationId;
    
    Object.setPrototypeOf(this, LegacyAppError.prototype);
  }
}

export class LegacyValidationError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('VALIDATION_ERROR', message, 400, 'VALIDATION', details, correlationId);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, LegacyValidationError.prototype);
  }
}

export class LegacyAuthenticationError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('AUTHENTICATION_ERROR', message, 401, 'AUTH', details, correlationId);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, LegacyAuthenticationError.prototype);
  }
}

export class LegacyAuthorizationError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('AUTHORIZATION_ERROR', message, 403, 'AUTH', details, correlationId);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, LegacyAuthorizationError.prototype);
  }
}

export class LegacyNotFoundError extends LegacyAppError {
  constructor(message: string, correlationId?: string) {
    super('NOT_FOUND', message, 404, 'CLIENT', undefined, correlationId);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, LegacyNotFoundError.prototype);
  }
}

export class LegacyConflictError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('CONFLICT', message, 409, 'CLIENT', details, correlationId);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, LegacyConflictError.prototype);
  }
}

export class LegacyRateLimitError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('RATE_LIMIT', message, 429, 'CLIENT', details, correlationId);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, LegacyRateLimitError.prototype);
  }
}

export class LegacyDatabaseError extends LegacyAppError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super('DATABASE_ERROR', message, 500, 'SYSTEM', details, correlationId);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, LegacyDatabaseError.prototype);
  }
}

/**
 * Error conversion utilities
 */
export class ErrorConversionAdapter {
  /**
   * Converts legacy error to core AppError
   */
  static convertLegacyError(legacyError: LegacyAppError): AppError {
    return new AppError(
      legacyError.code,
      legacyError.message,
      legacyError.statusCode,
      legacyError.category as any,
      legacyError.details,
      legacyError.correlationId
    );
  }

  /**
   * Converts core AppError to legacy format for backward compatibility
   */
  static convertToLegacyError(coreError: AppError): LegacyAppError {
    return new LegacyAppError(
      coreError.code,
      coreError.message,
      coreError.statusCode,
      coreError.category,
      coreError.details,
      coreError.correlationId
    );
  }

  /**
   * Detects if an error is a legacy error
   */
  static isLegacyError(error: any): error is LegacyAppError {
    return error instanceof LegacyAppError || 
           (error && typeof error === 'object' && 
            'code' in error && 'statusCode' in error && 'category' in error);
  }

  /**
   * Normalizes any error to core AppError format
   */
  static normalizeError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (this.isLegacyError(error)) {
      return this.convertLegacyError(error);
    }

    if (error instanceof Error) {
      return new AppError(
        'UNKNOWN_ERROR',
        error.message,
        500,
        'SYSTEM',
        { originalError: error.name },
        undefined
      );
    }

    return new AppError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      500,
      'SYSTEM',
      { originalError: String(error) },
      undefined
    );
  }
}

/**
 * Legacy error response formatter adapter
 */
export class LegacyErrorResponseFormatter {
  static format(error: LegacyAppError | AppError) {
    const normalizedError = ErrorConversionAdapter.normalizeError(error);
    
    return {
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        category: normalizedError.category,
        statusCode: normalizedError.statusCode,
        details: normalizedError.details,
        correlationId: normalizedError.correlationId,
        timestamp: new Date().toISOString()
      }
    };
  }

  static formatValidationError(error: LegacyValidationError | any) {
    return {
      success: false,
      error: 'Validation Error',
      message: error.message,
      details: error.details || {},
      correlationId: error.correlationId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Correlation ID utilities
 */
export class CorrelationIdAdapter {
  static generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createCorrelationIdMiddleware() {
    return (req: any, res: any, next: any) => {
      req.correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      res.setHeader('X-Correlation-ID', req.correlationId);
      next();
    };
  }
}

/**
 * Legacy error handler middleware adapter
 */
export class LegacyErrorHandlerAdapter {
  static createErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      const normalizedError = ErrorConversionAdapter.normalizeError(error);
      const response = LegacyErrorResponseFormatter.format(normalizedError);
      
      // Log error
      console.error('Error occurred:', {
        error: normalizedError,
        correlationId: req.correlationId,
        url: req.url,
        method: req.method
      });

      res.status(normalizedError.statusCode).json(response);
    };
  }

  static createValidationErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      if (error instanceof LegacyValidationError || 
          (error && error.name === 'ValidationError')) {
        const response = LegacyErrorResponseFormatter.formatValidationError(error);
        return res.status(400).json(response);
      }
      next(error);
    };
  }
}

/**
 * Factory function to create all legacy error adapters
 */
export function createLegacyErrorAdapters() {
  return {
    ErrorConversionAdapter,
    LegacyErrorResponseFormatter,
    CorrelationIdAdapter,
    LegacyErrorHandlerAdapter,
    // Legacy error classes for backward compatibility
    LegacyAppError,
    LegacyValidationError,
    LegacyAuthenticationError,
    LegacyAuthorizationError,
    LegacyNotFoundError,
    LegacyConflictError,
    LegacyRateLimitError,
    LegacyDatabaseError
  };
}