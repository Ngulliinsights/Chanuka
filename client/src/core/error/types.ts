/**
 * Unified Error Types for Client-Side Cross-Cutting Concerns
 *
 * This module defines the core error types and interfaces used across
 * all client-side error handling, consolidated from multiple sources
 * with enhanced modular architecture.
 */

import { ErrorDomain, ErrorSeverity, RecoveryAction } from './constants';

// ============================================================================
// Recovery Strategy Types
// ============================================================================

export interface RecoveryStrategy {
  id: string;
  type: RecoveryAction;
  name: string;
  description: string;
  automatic: boolean;
  action?: () => Promise<boolean> | boolean;
  conditions?: (error: AppError, context?: Partial<ErrorContext>) => boolean;
  priority?: number;
  maxRetries?: number;
  timeout?: number;
  syncAction?: () => boolean;
  asyncAction?: () => Promise<boolean>;
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message?: string;
  nextAction?: RecoveryAction;
}

// ============================================================================
// Core Error Types (Consolidated from multiple sources)
// ============================================================================

/**
 * Contextual information that helps with debugging and error correlation.
 * This data travels with the error through the entire handling pipeline.
 */
export interface ErrorContext {
  component?: string;      // Component where error originated
  operation?: string;      // Operation being performed
  userId?: string;         // User context
  sessionId?: string;      // Session identifier
  requestId?: string;      // Request tracking ID
  url?: string;           // Current URL
  userAgent?: string;     // Browser information
  retryCount?: number;    // Number of retry attempts
  route?: string;         // Current route
  timestamp?: number;     // Error timestamp
  [key: string]: unknown; // Additional custom context
}

/**
 * Complete metadata package for error tracking and analysis
 */
export interface ErrorMetadata {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: ErrorContext;
  retryable: boolean;
  recoverable: boolean;
  correlationId?: string;
  cause?: Error | unknown;
  code: string;
}

/**
 * Unified AppError class consolidating all conflicting AppError interfaces
 * Enhanced with comprehensive error handling capabilities
 */
export class AppError extends Error {
  public readonly id: string;
  public readonly type: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly timestamp: number;
  public readonly context?: ErrorContext;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly recoveryStrategies: RecoveryStrategy[];
  public readonly retryCount: number;
  public readonly recovered?: boolean;
  public readonly recoveryStrategy?: string;
  public readonly stack?: string;
  public readonly cause?: Error;
  public readonly metadata?: ErrorMetadata;
  public readonly correlationId: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    domain: ErrorDomain,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: AppErrorOptions = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.id = options.correlationId || crypto.randomUUID?.() || Math.random().toString(36);
    this.code = code;
    this.type = domain;
    this.severity = severity;
    this.timestamp = Date.now();
    this.statusCode = options.statusCode;
    this.context = options.context;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.recoverable = options.recoverable ?? false;
    this.retryable = options.retryable ?? false;
    this.recoveryStrategies = options.recoveryStrategies ?? [];
    this.retryCount = options.retryCount ?? 0;
    this.recovered = options.recovered ?? false;
    this.recoveryStrategy = options.recoveryStrategy;
    this.cause = options.cause;
    this.metadata = options.metadata;
    this.correlationId = options.correlationId || this.id;
    this.details = options.details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Serialize error to JSON for logging/reporting
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      userId: this.userId,
      sessionId: this.sessionId,
      recoverable: this.recoverable,
      retryable: this.retryable,
      recoveryStrategies: this.recoveryStrategies.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        priority: s.priority
      })),
      retryCount: this.retryCount,
      recovered: this.recovered,
      recoveryStrategy: this.recoveryStrategy,
      correlationId: this.correlationId,
      stack: this.stack,
      details: this.details,
    };
  }

  /**
   * Check if this error can be recovered
   */
  canRecover(): boolean {
    return this.recoverable && this.recoveryStrategies.length > 0;
  }

  /**
   * Get applicable recovery strategies
   */
  getRecoveryStrategies(): RecoveryStrategy[] {
    return this.recoveryStrategies;
  }

  /**
   * Create a new error with incremented retry count
   */
  withRetry(): AppError {
    return new AppError(
      this.message,
      this.code,
      this.type,
      this.severity,
      {
        ...this,
        retryCount: this.retryCount + 1,
      }
    );
  }
}

// ============================================================================
// Supporting Interfaces and Types
// ============================================================================

export interface AppErrorOptions {
  statusCode?: number;
  context?: ErrorContext;
  userId?: string;
  sessionId?: string;
  recoverable?: boolean;
  retryable?: boolean;
  recoveryStrategies?: RecoveryStrategy[];
  retryCount?: number;
  recovered?: boolean;
  recoveryStrategy?: string;
  cause?: Error;
  metadata?: ErrorMetadata;
  correlationId?: string;
  details?: Record<string, unknown>;
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  priority: number;
  maxRetries?: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  maxErrors?: number;
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  notificationDebounceMs?: number;
  logErrors?: boolean;
  enableAnalytics?: boolean;
}

/**
 * Error listener callback type
 */
export type ErrorListener = (error: AppError) => void;

/**
 * Error statistics interface
 */
export interface ErrorStats {
  total: number;
  byType: Record<ErrorDomain, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recent: {
    lastHour: number;
    last24Hours: number;
    last7Days: number;
  };
  recovered: number;
  retryable: number;
}

/**
 * React error boundary error info
 */
export interface ReactErrorInfo {
  componentStack: string;
}

/**
 * Error boundary props interface
 */
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
  enableRecovery?: boolean;
  context?: string;
  showTechnicalDetails?: boolean;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ReactErrorInfo;
  resetError: () => void;
  context?: string;
  showTechnicalDetails?: boolean;
}


// ============================================================================
// Analytics and Reporting Interfaces (from utils/errors.ts)
// ============================================================================

/**
 * Interface for error analytics providers (e.g., Sentry, DataDog)
 */
export interface ErrorAnalyticsProvider {
  name: string;
  track: (error: AppError) => Promise<void>;
  isEnabled: () => boolean;
}

/**
 * Interface for error reporting services
 */
export interface ErrorReporter {
  report(error: AppError): Promise<void>;
}

/**
 * Interface for error transformation logic
 */
export interface ErrorTransformer {
  transform(error: AppError): AppError;
}

// ============================================================================
// Navigation Error Types (from utils/errors.ts)
// ============================================================================

/**
 * Navigation-specific error types for handling routing and navigation failures
 */
export enum NavigationErrorType {
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  NAVIGATION_ITEM_NOT_FOUND = 'NAVIGATION_ITEM_NOT_FOUND',
  INVALID_NAVIGATION_PATH = 'INVALID_NAVIGATION_PATH',
  NAVIGATION_ACCESS_DENIED = 'NAVIGATION_ACCESS_DENIED',
  NAVIGATION_VALIDATION_ERROR = 'NAVIGATION_VALIDATION_ERROR',
  NAVIGATION_CONFIGURATION_ERROR = 'NAVIGATION_CONFIGURATION_ERROR'
}

// ============================================================================
// Re-export shared error types for convenience
// ============================================================================

export { ErrorDomain, ErrorSeverity, RecoveryAction } from './constants';

