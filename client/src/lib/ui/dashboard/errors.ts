/**
 * Dashboard-specific error types
 * Self-contained error system for dashboard operations
 */

// ============================================================================
// Core Error Types & Constants
// ============================================================================

export enum ErrorDomain {
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  endpoint?: string;
  field?: string;
  value?: unknown;
  action?: string;
  topicId?: string;
  [key: string]: unknown;
}

export interface BaseErrorOptions {
  statusCode?: number;
  code?: string;
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
  retryable?: boolean;
  recoverable?: boolean;
  context?: ErrorContext;
}

// ============================================================================
// Core Error Base Classes
// ============================================================================

/**
 * Base error class with enhanced metadata
 */
export class BaseError extends Error {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly domain: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly recoverable: boolean;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;

  constructor(message: string, options?: BaseErrorOptions) {
    super(message);
    this.name = 'BaseError';
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? 'UNKNOWN_ERROR';
    this.domain = options?.domain ?? ErrorDomain.SYSTEM;
    this.severity = options?.severity ?? ErrorSeverity.MEDIUM;
    this.retryable = options?.retryable ?? false;
    this.recoverable = options?.recoverable ?? true;
    this.context = options?.context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends BaseError {
  public readonly name: string;

  constructor(message: string, context?: ErrorContext) {
    super(message, {
      statusCode: 503,
      code: 'NETWORK_ERROR',
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      recoverable: true,
      context,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends BaseError {
  public readonly name: string;
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string,
    errors: Record<string, string[]>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoverable: true,
      context,
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Dashboard Error Types
// ============================================================================

export enum DashboardErrorType {
  DASHBOARD_ERROR = 'DASHBOARD_ERROR',
  DASHBOARD_DATA_FETCH_ERROR = 'DASHBOARD_DATA_FETCH_ERROR',
  DASHBOARD_VALIDATION_ERROR = 'DASHBOARD_VALIDATION_ERROR',
  DASHBOARD_CONFIGURATION_ERROR = 'DASHBOARD_CONFIGURATION_ERROR',
  DASHBOARD_ACTION_ERROR = 'DASHBOARD_ACTION_ERROR',
  DASHBOARD_TOPIC_ERROR = 'DASHBOARD_TOPIC_ERROR',
}

// ============================================================================
// Dashboard Error Classes
// ============================================================================

/**
 * Base dashboard error - all dashboard errors extend this
 */
export class DashboardError extends BaseError {
  public readonly name: string;
  public readonly dashboardType: DashboardErrorType;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    dashboardType: DashboardErrorType = DashboardErrorType.DASHBOARD_ERROR,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(message, {
      statusCode: options?.statusCode ?? 400,
      code: dashboardType,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: true,
      context: {
        component: 'Dashboard',
        ...options?.context,
      },
    });

    this.name = 'DashboardError';
    this.dashboardType = dashboardType;
    this.details = options?.details;
  }
}

/**
 * Dashboard data fetch error - for data loading failures
 */
export class DashboardDataFetchError extends NetworkError {
  public readonly name: string;
  public readonly endpoint: string;

  constructor(
    endpoint: string,
    reason?: string,
    options?: {
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(
      `Failed to fetch dashboard data from ${endpoint}${reason ? `: ${reason}` : ''}`,
      {
        operation: 'data_fetch',
        endpoint,
        ...options?.context,
      }
    );
    this.name = 'DashboardDataFetchError';
    this.endpoint = endpoint;
  }
}

/**
 * Dashboard validation error - for input validation failures
 */
export class DashboardValidationError extends ValidationError {
  public readonly name: string;
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field: string,
    value: unknown,
    options?: {
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(
      message,
      { [field]: [message] },
      {
        operation: 'validation',
        field,
        value,
        ...options?.context,
      }
    );
    this.name = 'DashboardValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Dashboard configuration error - for setup/config failures
 */
export class DashboardConfigurationError extends BaseError {
  public readonly name: string;

  constructor(
    message: string,
    options?: {
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(message, {
      statusCode: 500,
      code: 'DASHBOARD_CONFIGURATION_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      recoverable: false,
      context: {
        component: 'Dashboard',
        ...options?.context,
      },
    });
    this.name = 'DashboardConfigurationError';
  }
}

/**
 * Dashboard action error - for operation/action failures
 */
export class DashboardActionError extends BaseError {
  public readonly name: string;
  public readonly action: string;

  constructor(
    action: string,
    reason?: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(`Dashboard action failed: ${action}${reason ? ` - ${reason}` : ''}`, {
      statusCode: options?.statusCode ?? 400,
      code: 'DASHBOARD_ACTION_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoverable: true,
      context: {
        component: 'Dashboard',
        action,
        ...options?.context,
      },
    });
    this.name = 'DashboardActionError';
    this.action = action;
  }
}

/**
 * Dashboard topic error - for topic/data entity failures
 */
export class DashboardTopicError extends BaseError {
  public readonly name: string;
  public readonly operation: string;
  public readonly topicId?: string;

  constructor(
    operation: string,
    topicId?: string,
    reason?: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      context?: ErrorContext;
    }
  ) {
    super(
      `Topic operation failed: ${operation}${topicId ? ` (${topicId})` : ''}${reason ? ` - ${reason}` : ''}`,
      {
        statusCode: options?.statusCode ?? 400,
        code: 'DASHBOARD_TOPIC_ERROR',
        domain: ErrorDomain.BUSINESS_LOGIC,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoverable: true,
        context: {
          component: 'Dashboard',
          operation,
          topicId,
          ...options?.context,
        },
      }
    );
    this.name = 'DashboardTopicError';
    this.operation = operation;
    this.topicId = topicId;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDashboardError(error: unknown): error is DashboardError {
  return error instanceof DashboardError;
}

export function isDashboardDataFetchError(
  error: unknown
): error is DashboardDataFetchError {
  return error instanceof DashboardDataFetchError;
}

export function isDashboardValidationError(
  error: unknown
): error is DashboardValidationError {
  return error instanceof DashboardValidationError;
}

export function isDashboardConfigurationError(
  error: unknown
): error is DashboardConfigurationError {
  return error instanceof DashboardConfigurationError;
}

export function isDashboardActionError(
  error: unknown
): error is DashboardActionError {
  return error instanceof DashboardActionError;
}

export function isDashboardTopicError(
  error: unknown
): error is DashboardTopicError {
  return error instanceof DashboardTopicError;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: BaseError): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    domain: error.domain,
    severity: error.severity,
    retryable: error.retryable,
    recoverable: error.recoverable,
    context: error.context,
    timestamp: error.timestamp,
    stack: error.stack,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return error instanceof BaseError && error.retryable;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  return error instanceof BaseError && error.recoverable;
}