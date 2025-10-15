import { Request, Response, NextFunction } from 'express';
import { ApiResponseWrapper, ErrorCodes, HttpStatus } from '../utils/api-response.js';
import { errorTracker } from '../core/errors/error-tracker.js';
import { logger } from '../utils/logger';

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

// Custom application error class with enhanced type safety
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string, 
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, 
    code: string = ErrorCodes.GENERIC_ERROR, 
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown (V8 engines only)
    Error.captureStackTrace(this, this.constructor);
  }
}

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
 * Analyzes error patterns to determine context for unhandled errors
 * This is our safety net for errors we haven't explicitly categorized
 */
function analyzeUnhandledError(error: Error): ErrorContext {
  const errorMessage = error.message.toLowerCase();
  
  // Database-related errors
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    return {
      severity: 'medium',
      category: 'database',
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_ENTRY',
      message: 'Resource already exists'
    };
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return {
      severity: 'low',
      category: 'database',
      statusCode: HttpStatus.NOT_FOUND,
      code: ErrorCodes.NOT_FOUND,
      message: 'Resource not found'
    };
  }
  
  if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
    return {
      severity: 'critical',
      category: 'database',
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: ErrorCodes.DATABASE_ERROR,
      message: 'Database connection failed'
    };
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      severity: 'medium',
      category: 'system',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded'
    };
  }
  
  // JWT and authentication errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      severity: 'medium',
      category: 'authentication',
      statusCode: HttpStatus.UNAUTHORIZED,
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Invalid or expired token'
    };
  }
  
  // Validation errors
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return {
      severity: 'medium',
      category: 'validation',
      statusCode: HttpStatus.BAD_REQUEST,
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.message
    };
  }
  
  // Default case for truly unexpected errors
  return {
    severity: 'high',
    category: 'system',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCodes.GENERIC_ERROR,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  };
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
  let context: ErrorContext;
  
  // Handle our custom AppError instances with known context
  if (error instanceof AppError) {
    context = {
      severity: getSeverityFromStatusCode(error.statusCode),
      category: getCategoryFromErrorCode(error.code),
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details
    };
  } else {
    // For unknown errors, analyze and determine appropriate context
    context = analyzeUnhandledError(error);
  }
  
  // Log the error with full context for debugging
  logError(error, req, context);
  
  // Track the error in our monitoring system
  errorTracker.trackRequestError(error, req, context.severity, context.category);
  
  // Create metadata only after we've done all the processing
  // This is more efficient as metadata creation involves timestamp calculations
  const metadata = ApiResponseWrapper.createMetadata(startTime, undefined, {
    requestId: typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined
  });
  
  // Send the standardized error response
  ApiResponseWrapper.error(
    res,
    {
      code: context.code,
      message: context.message,
      details: context.details
    },
    context.statusCode,
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
): AppError => {
  return new AppError(message, statusCode, code, details);
};

// Convenience factory functions for common error scenarios
// These make your code more readable: throw NotFoundError('User') vs throw new AppError(...)

export const NotFoundError = (resource: string = 'Resource'): AppError => 
  new AppError(
    `${resource} not found`, 
    HttpStatus.NOT_FOUND, 
    ErrorCodes.NOT_FOUND
  );

export const ValidationError = (details: any): AppError => 
  new AppError(
    'Validation failed', 
    HttpStatus.BAD_REQUEST, 
    ErrorCodes.VALIDATION_ERROR, 
    details
  );

export const UnauthorizedError = (message: string = 'Unauthorized access'): AppError => 
  new AppError(
    message, 
    HttpStatus.UNAUTHORIZED, 
    ErrorCodes.UNAUTHORIZED
  );

export const ForbiddenError = (message: string = 'Access forbidden'): AppError => 
  new AppError(
    message, 
    HttpStatus.FORBIDDEN, 
    ErrorCodes.FORBIDDEN
  );

export const DatabaseError = (message: string = 'Database operation failed'): AppError => 
  new AppError(
    message, 
    HttpStatus.INTERNAL_SERVER_ERROR, 
    ErrorCodes.DATABASE_ERROR
  );

export const RateLimitError = (message: string = 'Rate limit exceeded'): AppError =>
  new AppError(
    message,
    HttpStatus.TOO_MANY_REQUESTS,
    ErrorCodes.RATE_LIMIT_EXCEEDED
  );






