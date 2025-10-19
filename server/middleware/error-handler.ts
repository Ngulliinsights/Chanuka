/**
 * LEGACY MIDDLEWARE - DEPRECATED
 * 
 * This file has been consolidated into the unified middleware system.
 * Please update your imports to use:
 * 
 * import { errorHandler } from '@shared/core/middleware/legacy-adapters/server-middleware-adapter'
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponseWrapper, ErrorCodes, HttpStatus } from '@shared/core/utilities/api';
import { logger } from '../../shared/core/logger.js';
import { 
  BaseError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError
} from '../../shared/core/index.js';
import { ErrorDomain, ErrorSeverity, DatabaseError, ConflictError } from '../utils/errors.js';

console.warn('[DEPRECATED] server/middleware/error-handler.ts is deprecated. Please import from @shared/core/middleware instead.');

// Simple error tracker
const errorTracker = {
  track: (error: Error, context?: any) => {
    logger.error('Error tracked', { error: error.message, context });
  }
};

// Additional error classes
class TooManyRequestsError extends BaseError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

// Type definitions for better type safety
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic';

interface ErrorContext {
  severity: ErrorSeverity;
  category: ErrorCategory;
  statusCode: number;
  code: string;
  message: string;
  details?: any;
}

// Use the unified BaseError from shared core
export { BaseError };

/**
 * Determines the severity level based on HTTP status code
 * This helps categorize errors for monitoring and alerting systems
 */
function getSeverityFromStatusCode(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) return 'high';
  if (statusCode >= 400) return 'medium';
  return 'low';
}

/**
 * Determines the error category based on error code pattern
 * This helps route errors to the appropriate team or system
 */
function getCategoryFromErrorCode(code: string): ErrorCategory {
  if (code.includes('DATABASE')) return 'database';
  if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) return 'authentication';
  if (code.includes('VALIDATION')) return 'validation';
  if (code.includes('EXTERNAL') || code.includes('API')) return 'external_api';
  return 'business_logic';
}

/**
 * Converts generic errors to BaseError instances
 * This leverages the unified error management system
 */
function convertToBaseError(error: Error): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  const errorMessage = error.message.toLowerCase();
  
  // Database-related errors
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    return new BaseError('Resource already exists', {
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_ENTRY',
      domain: ErrorDomain.DATABASE,
      severity: ErrorSeverity.MEDIUM,
      cause: error
    });
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return new NotFoundError('Resource not found', undefined, { cause: error });
  }
  
  if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
    return new DatabaseError('Database connection failed', undefined, { 
      severity: ErrorSeverity.CRITICAL,
      cause: error 
    });
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return new TooManyRequestsError('Rate limit exceeded', undefined, { cause: error });
  }
  
  // JWT and authentication errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Invalid or expired token', { cause: error });
  }
  
  // Validation errors
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return new ValidationError('Validation failed', undefined, { 
      details: error.message,
      cause: error 
    });
  }
  
  // Default case for truly unexpected errors
  return new BaseError(
    process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.GENERIC_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      cause: error
    }
  );
}

/**
 * Logs error details for debugging and monitoring
 * In production, this would typically integrate with services like Sentry or DataDog
 */
function logError(error: Error, req: Request, context: ErrorContext): void {
  const logData = {
    message: error.message,
    name: error.name,
    code: context.code,
    severity: context.severity,
    category: context.category,
    statusCode: context.statusCode,
    // Only include stack traces in development to avoid leaking sensitive info
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    request: {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id'] || 'unknown'
    },
    timestamp: new Date().toISOString()
  };
  
  // Use appropriate log level based on severity
  if (context.severity === 'critical' || context.severity === 'high') {
    logger.error('CRITICAL/HIGH Error:', { component: 'Chanuka' }, logData);
  } else {
    console.warn('Error:', logData);
  }
}

/**
 * Centralized error handler with standardized API responses
 * This middleware should be registered last in your Express app
 * 
 * Key improvements:
 * - Lazy metadata creation (only when needed)
 * - Consistent error tracking for all paths
 * - Cleaner separation of concerns
 * - Better type safety
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  
  // Convert to BaseError using unified system
  const baseError = convertToBaseError(error);
  
  // Add request context to error
  const enhancedError = new BaseError(baseError.message, {
    ...baseError,
    correlationId: req.headers['x-correlation-id'] as string || baseError.metadata.correlationId,
    context: {
      ...baseError.metadata.context,
      requestPath: req.path,
      requestMethod: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      requestId: req.headers['x-request-id'] as string
    }
  });
  
  // Log the error with full context for debugging
  logger.error('Request error handled', {
    component: 'ErrorHandler',
    errorId: enhancedError.errorId,
    path: req.path,
    method: req.method,
    statusCode: enhancedError.statusCode,
    severity: enhancedError.metadata.severity,
    domain: enhancedError.metadata.domain
  });
  
  // Track the error in our monitoring system
  const severity = enhancedError.metadata.severity as 'low' | 'medium' | 'high' | 'critical';
  const category = enhancedError.metadata.domain as 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic';
  errorTracker.trackRequestError(enhancedError, req, severity, category);
  
  // Create metadata for response
  const metadata = ApiResponseWrapper.createMetadata(startTime, undefined, {
    requestId: enhancedError.metadata.context?.requestId,
    correlationId: enhancedError.metadata.correlationId
  });
  
  // Send the standardized error response
  ApiResponseWrapper.error(
    res,
    {
      code: enhancedError.code,
      message: enhancedError.getUserMessage(),
      details: enhancedError.details,
      errorId: enhancedError.errorId
    },
    enhancedError.statusCode,
    metadata
  );
}

/**
 * Helper function to create application errors
 * This provides a convenient way to throw errors throughout your application
 */
export const createError = (
  message: string, 
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, 
  code: string = ErrorCodes.GENERIC_ERROR, 
  details?: any
): BaseError => {
  return new BaseError(message, statusCode, code, details);
};

// Re-export convenience functions from unified error management
export { 
  NotFoundError, 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError
};

export { DatabaseError } from '../utils/errors.js';
export { TooManyRequestsError as RateLimitError };












































