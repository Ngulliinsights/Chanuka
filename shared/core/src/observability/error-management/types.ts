/**
 * Type definitions for Error Management System
 */

export type { 
  BaseErrorOptions,
  ErrorMetadata,
  RecoveryStrategy,
  ErrorDomain,
  ErrorSeverity
} from './errors/base-error.js';

export type {
  CircuitBreakerOptions,
  CircuitBreakerMetrics,
  CircuitBreakerState
} from './patterns/circuit-breaker.js';

export type {
  RetryOptions,
  RetryResult
} from './patterns/retry-patterns.js';

// Common error handler interface
export interface ErrorHandler {
  handle(error: Error): Promise<void> | void;
  canHandle(error: Error): boolean;
}

// Error reporting interface
export interface ErrorReporter {
  report(error: Error, context?: Record<string, any>): Promise<void>;
}

// Error recovery interface
export interface ErrorRecovery {
  recover(error: Error): Promise<boolean>;
  canRecover(error: Error): boolean;
}

// Error context for tracking
export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

// Error metrics interface
export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError?: Date;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
}




































