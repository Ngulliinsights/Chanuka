/**
 * Shared Core Utilities - Main Entry Point
 * Consolidated utilities for the Chanuka platform
 * 
 * This file provides essential exports for client-side usage,
 * avoiding circular dependencies while maintaining functionality.
 */

// Essential logger - type-safe implementation
interface LogContext {
  component?: string;
  user_id?: string;
  requestId?: string;
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: LogContext, error?: Error | unknown) => void;
}

export const logger: Logger = {
  debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context ?? {}, meta ?? {});
    }
  },
  info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, context ?? {}, meta ?? {});
  },
  warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context ?? {}, meta ?? {});
  },
  error: (message: string, context?: LogContext, error?: Error | unknown) => {
    const errorInfo = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    console.error(`[ERROR] ${message}`, context ?? {}, errorInfo ?? {});
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

// Type-safe API response utilities
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

type ApiResponseType<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ApiResponse = {
  success: <T = unknown>(data: T, message = 'Success'): ApiSuccessResponse<T> => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  error: (message: string, code = 'ERROR', statusCode = 500): ApiErrorResponse => ({
    success: false,
    error: { message, code, statusCode },
    timestamp: new Date().toISOString()
  }),
  
  notFound: (message = 'Resource not found'): ApiErrorResponse => ({
    success: false,
    error: { message, code: 'NOT_FOUND', statusCode: 404 },
    timestamp: new Date().toISOString()
  }),
  
  validation: (message: string, details?: Record<string, unknown>): ApiErrorResponse => ({
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

// Type-safe API Response helper functions for Express responses
interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (data: unknown) => ExpressResponse;
}

interface ResponseMetadata {
  requestId?: string;
  responseTime?: number;
  source?: string;
  [key: string]: unknown;
}

export const ApiSuccessResponse = <T = unknown>(
  res: ExpressResponse, 
  data: T, 
  metadata?: ResponseMetadata
): ExpressResponse => {
  return res.status(200).json({
    success: true,
    data,
    metadata: metadata ?? {},
    timestamp: new Date().toISOString()
  });
};

export const ApiErrorResponse = (
  res: ExpressResponse, 
  message: string, 
  statusCode = 500, 
  metadata?: ResponseMetadata
): ExpressResponse => {
  return res.status(statusCode).json({
    success: false,
    error: { message, statusCode },
    metadata: metadata ?? {},
    timestamp: new Date().toISOString()
  });
};

export const ApiValidationErrorResponse = (
  res: ExpressResponse, 
  errors: Record<string, string[]> | string[], 
  metadata?: ResponseMetadata
): ExpressResponse => {
  return res.status(400).json({
    success: false,
    error: { message: 'Validation failed', errors, statusCode: 400 },
    metadata: metadata ?? {},
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
  
  middleware: (limit = 100, windowMs = 15 * 60 * 1000) => {
    interface Request {
      ip?: string;
    }
    
    interface Response {
      status: (code: number) => Response;
      json: (data: unknown) => Response;
    }
    
    type NextFunction = () => void;
    
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip ?? 'unknown';
      
      if (!RateLimit.check(key, limit, windowMs)) {
        return res.status(429).json(
          ApiResponse.error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429)
        );
      }
      
      next();
    };
  }
};

// Type-safe error recovery engine
interface RecoveryOptions {
  suggestions: string[];
  automatic: boolean;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorRecoveryEngine {
  suggestRecovery: (error: Error | unknown) => RecoveryOptions;
}

export const createErrorRecoveryEngine = (): ErrorRecoveryEngine => ({
  suggestRecovery: (error: Error | unknown): RecoveryOptions => {
    const isNetworkError = error instanceof Error && 
      (error.message.includes('fetch') || error.message.includes('network'));
    
    const isChunkError = error instanceof Error && 
      error.message.includes('Loading chunk');
    
    if (isNetworkError) {
      return {
        suggestions: ['Check your internet connection', 'Try again in a moment'],
        automatic: false,
        retryable: true,
        severity: 'medium'
      };
    }
    
    if (isChunkError) {
      return {
        suggestions: ['Refresh the page', 'Clear browser cache'],
        automatic: false,
        retryable: true,
        severity: 'high'
      };
    }
    
    return {
      suggestions: ['Try refreshing the page', 'Contact support if the issue persists'],
      automatic: false,
      retryable: false,
      severity: 'medium'
    };
  }
});

export const AutomatedErrorRecoveryEngine = createErrorRecoveryEngine;

// Type-safe Enhanced Error Boundary interface
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError?: () => void }>;
}

export const ErrorBoundary = ({ children }: ErrorBoundaryProps) => {
  // This is a simplified version - the full implementation should be in the client
  return children;
};

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
}

export interface RecoverySuggestion {
  type: string;
  message: string;
  action?: () => void;
}

// Cache keys for consistent caching across the application
export const cacheKeys = { USER_PROFILE: (user_id: string) => `user:profile:${user_id }`,
  BILL_DETAILS: (bill_id: number) => `bill:details:${ bill_id }`,
  BILL_COMMENTS: (bill_id: number) => `bill:comments:${ bill_id }`,
  USER_ENGAGEMENT: (user_id: string) => `user:engagement:${ user_id }`,
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
