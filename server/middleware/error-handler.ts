
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle custom application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        details: error.details
      }
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.message
      }
    });
  }

  // Handle database errors
  if (error.message.includes('duplicate key')) {
    return res.status(409).json({
      error: {
        message: 'Resource already exists',
        code: 'DUPLICATE_ENTRY'
      }
    });
  }

  if (error.message.includes('not found')) {
    return res.status(404).json({
      error: {
        message: 'Resource not found',
        code: 'NOT_FOUND'
      }
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
}
