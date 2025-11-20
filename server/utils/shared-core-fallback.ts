/**
 * Consolidated utilities - imports from shared/core when available
 * This provides unified access to shared utilities across the server
 */

// Import logger from shared/core
export { logger } from '../../shared/core/src/index.js';

// Performance monitoring fallback
export class Performance {
  private static timers = new Map<string, number>();

  static startTimer(label: string): { end: () => number } {
    const start = Date.now();
    this.timers.set(label, start);

    return {
      end: () => {
        const duration = Date.now() - start;
        this.timers.delete(label);
        return duration;
      }
    };
  }

  static measure(label: string, fn: () => any): any {
    const timer = this.startTimer(label);
    try {
      const result = fn();
      const duration = timer.end();
      console.debug(`Performance: ${label} took ${duration}ms`);
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
}

// Rate limiting fallback
export class RateLimit {
  private static requests = new Map<string, number[]>();

  static create(options: { windowMs: number; max: number }) {
    return (req: any, res: any, next: any) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - options.windowMs;

      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const requests = this.requests.get(key)!;
      // Remove old requests
      const validRequests = requests.filter(time => time > windowStart);

      if (validRequests.length >= options.max) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(options.windowMs / 1000)
        });
      }

      validRequests.push(now);
      this.requests.set(key, validRequests);
      next();
    };
  }
}

// API Response helpers
export class ApiResponse {
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      message: message || 'Success',
      timestamp: new Date().toISOString()
    };
  }

  static error(message: string, code?: string, statusCode?: number) {
    return {
      success: false,
      error: {
        message,
        code: code || 'UNKNOWN_ERROR',
        statusCode: statusCode || 500
      },
      timestamp: new Date().toISOString()
    };
  }
}

// API Response functions for Express responses
export const ApiSuccessResponse = (res: any, data: any, metadata?: any) => {
  return res.status(200).json({
    success: true,
    data,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const ApiErrorResponse = (res: any, message: string, statusCode: number = 500, metadata?: any) => {
  return res.status(statusCode).json({
    success: false,
    error: { message, statusCode },
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const ApiValidationErrorResponse = (res: any, errors: any, metadata?: any) => {
  return res.status(400).json({
    success: false,
    error: { message: 'Validation failed', errors, statusCode: 400 },
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const ApiNotFoundResponse = (res: any, message: string = 'Resource not found', metadata?: any) => {
  return res.status(404).json({
    success: false,
    error: { message, statusCode: 404 },
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const ApiUnauthorizedResponse = (res: any, message: string = 'Unauthorized', metadata?: any) => {
  return res.status(401).json({
    success: false,
    error: { message, statusCode: 401 },
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const ApiForbiddenResponse = (res: any, message: string = 'Forbidden', metadata?: any) => {
  return res.status(403).json({
    success: false,
    error: { message, statusCode: 403 },
    metadata,
    timestamp: new Date().toISOString()
  });
};

// For backward compatibility
export { ApiNotFoundResponse as ApiNotFound };
export { ApiUnauthorizedResponse as ApiUnauthorized };
export { ApiForbiddenResponse as ApiForbidden };

// Error codes and HTTP status constants
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// API Response classes for compatibility
export class ApiSuccess<T = any> {
  constructor(
    public data: T,
    public message: string = 'Success',
    public statusCode: number = 200
  ) { }

  toJSON() {
    return {
      success: true,
      data: this.data,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString()
    };
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'API_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode
      },
      timestamp: new Date().toISOString()
    };
  }
}

export class ApiValidationError extends ApiError {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ApiValidationError';
  }

  override toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Remove duplicate ApiResponseWrapper to avoid conflicts

// Cache service fallback
export const cacheService = {
  async get(key: string): Promise<any> {
    console.debug(`Cache get: ${key} (fallback - no caching)`);
    return null;
  },

  async set(_key: string, _value: any, _ttl?: number): Promise<void> {
    console.debug(`Cache set: ${_key} (fallback - no caching)`);
  },

  async delete(key: string): Promise<void> {
    console.debug(`Cache delete: ${key} (fallback - no caching)`);
  },

  async clear(): Promise<void> {
    console.debug('Cache clear (fallback - no caching)');
  }
};

// Cache keys for consistent caching across the application
export const cacheKeys = {
  USER_PROFILE: (user_id: string) => `user:profile:${user_id}`,
  BILL_DETAILS: (bill_id: number) => `bill:details:${bill_id}`,
  BILL_COMMENTS: (bill_id: number) => `bill:comments:${bill_id}`,
  USER_ENGAGEMENT: (user_id: string) => `user:engagement:${user_id}`,
  ANALYTICS: (key: string) => `analytics:${key}`
};

// For backward compatibility
export const CACHE_KEYS = cacheKeys;

// Simple cache utility
export const cache = {
  getOrSetCache: async <T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> => {
    // This is a simplified version - just execute the fetch function
    try {
      return await fetchFn();
    } catch (error) {
      console.error('Cache operation failed', { key, ttl }, error);
      throw error;
    }
  }
};

// Database connection fallback
export const database = {
  execute: async (_query: string, _params?: any[]) => {
    console.warn('Database execute called with fallback implementation');
    throw new Error('Database not available - using fallback mode');
  },

  query: async (_query: string, _params?: any[]) => {
    console.warn('Database query called with fallback implementation');
    return { rows: [], rowCount: 0 };
  }
};

// Error classes
export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Export everything that might be imported from @shared/core
export default {
  Performance,
  RateLimit,
  ApiResponse,
  cacheService,
  database,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError
};

