/**
 * Shared Core Utilities - Main Entry Point
 * Consolidated utilities for the Chanuka platform
 * 
 * This file provides essential exports for client-side usage,
 * avoiding circular dependencies while maintaining functionality.
 */

// Essential logger - fallback implementation
export const logger = {
  debug: (message: string, context?: any, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context || '', meta || '');
    }
  },
  info: (message: string, context?: any, meta?: any) => {
    console.info(`[INFO] ${message}`, context || '', meta || '');
  },
  warn: (message: string, context?: any, meta?: any) => {
    console.warn(`[WARN] ${message}`, context || '', meta || '');
  },
  error: (message: string, context?: any, error?: any) => {
    console.error(`[ERROR] ${message}`, context || '', error || '');
  }
};

// Logger is already exported above

// Error enums and types
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  DATA = 'data',
  INTEGRATION = 'integration'
}

// Export the full error management system
export * from './src/observability/error-management/errors/base-error';
export * from './src/observability/error-management/errors/specialized-errors';

// Essential API response utilities
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

// API Response types for compatibility
export class ApiSuccess<T = any> {
  constructor(
    public data: T,
    public message: string = 'Success',
    public statusCode: number = 200
  ) {}

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

  toJSON() {
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

export type ApiResponseWrapperType<T = any> = ApiSuccess<T> | ApiError;

// API Response helper functions for Express responses
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

// For backward compatibility with existing code - using different names to avoid conflicts
export { ApiSuccessResponse as ApiSuccessFunc };
export { ApiErrorResponse as ApiErrorFunc };
export { ApiValidationErrorResponse as ApiValidationErrorFunc };

// ApiResponseWrapper utility class
export class ApiResponseWrapper {
  static createMetadata(startTime: number, source: string) {
    return {
      responseTime: Date.now() - startTime,
      source,
      timestamp: new Date().toISOString()
    };
  }
}

// Essential performance monitoring
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

// Essential rate limiting (in-memory)
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

// Error recovery engine (simplified version for client)
export const createErrorRecoveryEngine = () => ({
  suggestRecovery: (error: any) => ({
    suggestions: ['Try refreshing the page', 'Check your connection'],
    automatic: false
  })
});

export const AutomatedErrorRecoveryEngine = createErrorRecoveryEngine;

// Enhanced Error Boundary (simplified version for client)
export const EnhancedErrorBoundary = ({ children, fallback }: any) => {
  // This is a simplified version - the full implementation should be in the client
  return children;
};

export interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
}

export interface RecoverySuggestion {
  type: string;
  message: string;
  action?: () => void;
}

// Cache keys for consistent caching across the application
export const cacheKeys = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  BILL_DETAILS: (billId: number) => `bill:details:${billId}`,
  BILL_COMMENTS: (billId: number) => `bill:comments:${billId}`,
  USER_ENGAGEMENT: (userId: string) => `user:engagement:${userId}`,
  ANALYTICS: (key: string) => `analytics:${key}`
};

// For backward compatibility
export const CACHE_KEYS = cacheKeys;

// Simple cache utility for client-side usage
export const cache = {
  getOrSetCache: async <T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> => {
    // This is a simplified version - server should use proper cache service
    try {
      return await fetchFn();
    } catch (error) {
      logger.error('Cache operation failed', { key, ttl }, error);
      throw error;
    }
  }
};

// Additional exports for compatibility - temporarily disabled to fix import issues
// export * from './src/index.js';

// Re-export types with aliases to resolve conflicts
export type { CircuitBreakerState as CacheCircuitBreakerState } from './src/caching/types';
export { CircuitBreakerState as ObservabilityCircuitBreakerState } from './src/observability/error-management/patterns/circuit-breaker';
export type { HealthStatus as ObservabilityHealthStatus } from './src/observability/health/types';
export type { HealthStatus as MiddlewareHealthStatus } from './src/middleware/types';
export type { HealthStatus as ServicesHealthStatus } from './src/types/services';
export type { RateLimitStore as RateLimitingStore } from './src/rate-limiting/types';
export type { RateLimitStore as ServicesRateLimitStore } from './src/types/services';
export type { RateLimitStore as MiddlewareRateLimitStore } from './src/middleware/types';
export { ValidationError as ValidationTypesError } from './src/validation/types';
export { ValidationError as ErrorManagementValidationError } from './src/observability/error-management/errors/specialized-errors';
export type { ValidationError as ValidationTypesAlias } from './src/types/validation-types';
export { ValidationError as ModernizationValidationError } from './src/modernization/types';
export type { ValidationResult as ValidationTypesResult } from './src/validation/types';
export type { ValidationResult as CoreValidationResult } from './src/validation/core/interfaces';
export type { ValidationResult as TypesValidationResult } from './src/types/validation-types';
export type { ValidationResult as MiddlewareValidationResult } from './src/middleware/types';
export type { ValidationResult as ServicesValidationResult } from './src/types/services';
