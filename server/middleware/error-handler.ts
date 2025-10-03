
import { Request, Response, NextFunction } from 'express';
import { ApiResponseWrapper, ErrorCodes, HttpStatus } from '../utils/api-response.js';

// Custom application error class
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'GENERIC_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Centralized error handler with standardized API responses
 * Provides consistent error formatting and proper logging
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  
  // Enhanced error logging for monitoring
  console.error('API Error occurred:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });

  const metadata = ApiResponseWrapper.createMetadata(startTime, 'database', {
    requestId: req.headers['x-request-id'] as string
  });

  // Handle custom application errors
  if (error instanceof AppError) {
    return ApiResponseWrapper.error(
      res,
      {
        code: error.code,
        message: error.message,
        details: error.details
      },
      error.statusCode,
      metadata
    );
  }

  // Handle validation errors (Zod, Joi, etc.)
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return ApiResponseWrapper.error(
      res,
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.message
      },
      HttpStatus.BAD_REQUEST,
      metadata
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return ApiResponseWrapper.error(
      res,
      {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid or expired token'
      },
      HttpStatus.UNAUTHORIZED,
      metadata
    );
  }

  // Handle database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    return ApiResponseWrapper.error(
      res,
      {
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists'
      },
      HttpStatus.CONFLICT,
      metadata
    );
  }

  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    return ApiResponseWrapper.error(
      res,
      {
        code: ErrorCodes.NOT_FOUND,
        message: 'Resource not found'
      },
      HttpStatus.NOT_FOUND,
      metadata
    );
  }

  // Handle database connection errors
  if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
    return ApiResponseWrapper.error(
      res,
      {
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Database connection failed'
      },
      HttpStatus.SERVICE_UNAVAILABLE,
      metadata
    );
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
    return ApiResponseWrapper.error(
      res,
      {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded'
      },
      HttpStatus.TOO_MANY_REQUESTS,
      metadata
    );
  }

  // Handle unexpected errors with proper logging
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    type: error.constructor.name,
    url: req.url,
    method: req.method
  });

  return ApiResponseWrapper.error(
    res,
    {
      code: ErrorCodes.GENERIC_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
    metadata
  );
}

// Helper function to create application errors
export const createError = (
  message: string, 
  statusCode: number = 500, 
  code: string = ErrorCodes.GENERIC_ERROR, 
  details?: any
) => {
  return new AppError(message, statusCode, code, details);
};

// Common error creators for convenience
export const NotFoundError = (resource: string = 'Resource') => 
  new AppError(`${resource} not found`, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);

export const ValidationError = (details: any) => 
  new AppError('Validation failed', HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, details);

export const UnauthorizedError = (message: string = 'Unauthorized access') => 
  new AppError(message, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);

export const ForbiddenError = (message: string = 'Access forbidden') => 
  new AppError(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);

export const DatabaseError = (message: string = 'Database operation failed') => 
  new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.DATABASE_ERROR);
