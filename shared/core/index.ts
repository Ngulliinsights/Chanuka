/**
 * Shared Core Utilities - Main Entry Point
 * Consolidated utilities for the Chanuka platform
 * 
 * This file provides essential exports for client-side usage,
 * avoiding circular dependencies while maintaining functionality.
 */

// Essential logger - import from consolidated observability
let logger: any;
try {
  // Import from the single source of truth for logging
  const loggingModule = require('./src/observability/logging');
  logger = loggingModule.logger || loggingModule.UnifiedLogger;
} catch (error) {
  // Fallback to simple console logger
  logger = {
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(message, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      console.info(message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(message, ...args);
    }
  };
}

export { logger };

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

// Essential error classes
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

// Re-export from src for server-side usage (when available)
try {
  const srcExports = require('./src');
  Object.assign(module.exports, srcExports);
} catch (error) {
  // Client-side or src not available, use essentials only
}