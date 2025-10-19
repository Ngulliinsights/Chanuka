/**
 * Shared Core Utilities
 * Consolidated utilities for the Chanuka platform
 */

// Logger
export { logger } from './logger.js';

// Error classes for basic error handling
export class BaseError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'BaseError';
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

// Simple API response utilities
export const ApiResponse = {
  success: (data: any, message = 'Success') => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  error: (message: string, code = 'ERROR', statusCode = 500) => ({
    success: false,
    error: { message, code, statusCode },
    timestamp: new Date().toISOString()
  }),
  
  notFound: (message = 'Resource not found') => ({
    success: false,
    error: { message, code: 'NOT_FOUND', statusCode: 404 },
    timestamp: new Date().toISOString()
  }),
  
  validation: (message: string, details?: any) => ({
    success: false,
    error: { message, code: 'VALIDATION_ERROR', statusCode: 400, details },
    timestamp: new Date().toISOString()
  })
};

// Simple performance monitoring
export const Performance = {
  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        logger.debug(`Performance: ${name} completed in ${duration}ms`);
        return duration;
      }
    };
  },
  
  measure: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const timer = Performance.startTimer(name);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
};

// Simple rate limiting (in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const RateLimit = {
  check: (key: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= limit) {
      return false;
    }
    
    record.count++;
    return true;
  },
  
  middleware: (limit: number = 100, windowMs: number = 15 * 60 * 1000) => {
    return (req: any, res: any, next: any) => {
      const key = req.ip || 'unknown';
      
      if (!RateLimit.check(key, limit, windowMs)) {
        return res.status(429).json(
          ApiResponse.error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429)
        );
      }
      
      next();
    };
  }
};