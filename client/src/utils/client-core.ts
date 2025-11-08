/**
 * Client-Safe Core Utilities
 * Browser-compatible implementations of shared functionality
 */

import { initializeCSPReporting, getCSPConfig, setCSPHeader } from './csp-headers';

export interface LogContext {
  component?: string;
  user_id?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
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
    console.error(`[ERROR] ${message}`, context ?? {}, error);
  }
};

export interface Performance {
  mark: (name: string) => void;
  measure: (name: string, startMark: string, endMark: string) => void;
  getEntriesByType: (type: string) => PerformanceEntry[];
  clearMarks: () => void;
  clearMeasures: () => void;
}

// Browser-safe performance monitoring
// Base error class for standardized error handling
export enum ErrorDomain {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  CACHE = 'cache',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorMetadata {
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
  timestamp?: Date;
  context?: Record<string, unknown>;
  recoveryStrategies?: Array<{
    type: string;
    label: string;
    action: () => void;
  }>;
  retryable?: boolean;
  correlationId?: string;
  cause?: Error | unknown;
}

export class BaseError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, unknown>;
  public readonly metadata?: ErrorMetadata;

  constructor(
    message: string, 
    code = 'UNKNOWN_ERROR', 
    metadata?: ErrorMetadata,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = {
      timestamp: new Date(),
      ...metadata
    };
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      metadata: this.metadata
    };
  }
}

// Validation error for handling input/data validation failures
export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', {
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      context: details
    });
  }
}

export const performanceMonitor: Performance = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        console.warn('Performance measurement failed:', e);
      }
    }
  },
  getEntriesByType: (type: string) => {
    if (typeof performance !== 'undefined') {
      return performance.getEntriesByType(type);
    }
    return [];
  },
  clearMarks: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
    }
  },
  clearMeasures: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMeasures();
    }
  }
};

// Initialize CSP reporting on module load
if (typeof document !== 'undefined') {
  initializeCSPReporting();

  // Set CSP header based on environment
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const cspConfig = getCSPConfig(environment);
  setCSPHeader(cspConfig);
}

// Simple validation service for API responses
export const validationService = {
  validate: async (schema: any, data: any) => {
    // Simple validation - in a real app this would use Zod or similar
    if (schema && typeof schema.parse === 'function') {
      return schema.parse(data);
    }
    return data;
  }
};