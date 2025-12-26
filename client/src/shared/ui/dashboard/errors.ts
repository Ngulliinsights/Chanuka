/**
 * Dashboard-specific error types
 * Extends core error system instead of reinventing it
 */

import {
  AppError,
  ErrorDomain,
  ErrorSeverity,
  ErrorContext,
  createError,
  BaseError,
} from '@client/core/error';

// ============================================================================
// Dashboard Error Types (extending core)
// ============================================================================

export enum DashboardErrorType {
  DASHBOARD_ERROR = 'DASHBOARD_ERROR',
  DASHBOARD_DATA_FETCH_ERROR = 'DASHBOARD_DATA_FETCH_ERROR',
  DASHBOARD_VALIDATION_ERROR = 'DASHBOARD_VALIDATION_ERROR',
  DASHBOARD_CONFIGURATION_ERROR = 'DASHBOARD_CONFIGURATION_ERROR',
  DASHBOARD_ACTION_ERROR = 'DASHBOARD_ACTION_ERROR',
  DASHBOARD_TOPIC_ERROR = 'DASHBOARD_TOPIC_ERROR'
}

// ============================================================================
// Dashboard Error Classes (extending core BaseError)
// ============================================================================

export class DashboardError extends BaseError {
  public readonly dashboardType: DashboardErrorType;
  public readonly type: DashboardErrorType;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    dashboardType: DashboardErrorType = DashboardErrorType.DASHBOARD_ERROR,
    statusCode: number = 400,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode,
      code: dashboardType,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: true,
      context: {
        component: 'Dashboard',
        ...context,
      },
    });

    this.dashboardType = dashboardType;
    this.type = dashboardType;
    this.details = details;
    this.name = 'DashboardError';
  }
}

export class DashboardDataFetchError extends DashboardError {
  constructor(endpoint: string, reason?: string, details?: Record<string, unknown>) {
    const errorDetails = { endpoint, reason, ...details };
    super(
      `Failed to fetch dashboard data from ${endpoint}${reason ? `: ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR,
      500,
      errorDetails,
      { operation: 'data_fetch', endpoint }
    );
    
    // Create a new instance with modified properties
    Object.defineProperty(this, 'retryable', {
      value: true,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }
}

export class DashboardValidationError extends DashboardError {
  constructor(message: string, field: string, value: unknown, details?: Record<string, unknown>) {
    const errorDetails = { field, value, ...details };
    super(
      message,
      DashboardErrorType.DASHBOARD_VALIDATION_ERROR,
      422,
      errorDetails,
      { operation: 'validation', field }
    );
    
    // Override properties using Object.defineProperty
    Object.defineProperty(this, 'type', {
      value: ErrorDomain.VALIDATION,
      writable: false,
      enumerable: true,
      configurable: false
    });
    
    Object.defineProperty(this, 'severity', {
      value: ErrorSeverity.LOW,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }
}

export class DashboardConfigurationError extends DashboardError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      DashboardErrorType.DASHBOARD_CONFIGURATION_ERROR,
      500,
      details,
      { operation: 'configuration' }
    );
    
    // Override severity using Object.defineProperty
    Object.defineProperty(this, 'severity', {
      value: ErrorSeverity.HIGH,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }
}

export class DashboardActionError extends DashboardError {
  constructor(action: string, reason?: string, details?: Record<string, unknown>) {
    super(
      `Dashboard action failed: ${action}${reason ? ` - ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_ACTION_ERROR,
      400,
      { action, reason, ...details },
      { operation: 'action', action }
    );
  }
}

export class DashboardTopicError extends DashboardError {
  constructor(operation: string, topicId?: string, reason?: string, details?: Record<string, unknown>) {
    super(
      `Topic ${operation} failed${topicId ? ` for topic ${topicId}` : ''}${reason ? `: ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_TOPIC_ERROR,
      400,
      { operation, topicId, reason, ...details },
      { operation: 'topic_management', topicId }
    );
  }
}

// ============================================================================
// Convenience Functions (using core error system)
// ============================================================================

export const createDashboardError = (
  type: DashboardErrorType,
  message: string,
  details?: Record<string, unknown>,
  context?: ErrorContext
): AppError => {
  return createError(
    ErrorDomain.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    message,
    {
      details: {
        dashboardErrorType: type,
        ...details,
      },
      context: {
        component: 'Dashboard',
        ...context,
      },
      recoverable: true,
      retryable: type === DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR,
    }
  );
};

export const createDashboardDataFetchError = (
  endpoint: string,
  reason?: string,
  details?: Record<string, unknown>
): AppError => {
  return createError(
    ErrorDomain.NETWORK,
    ErrorSeverity.MEDIUM,
    `Failed to fetch dashboard data from ${endpoint}${reason ? `: ${reason}` : ''}`,
    {
      details: {
        endpoint,
        reason,
        dashboardErrorType: DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR,
        ...details,
      },
      context: {
        component: 'Dashboard',
        operation: 'data_fetch',
        endpoint,
      },
      recoverable: true,
      retryable: true,
    }
  );
};

export const createDashboardValidationError = (
  message: string,
  field: string,
  value: unknown,
  details?: Record<string, unknown>
): AppError => {
  return createError(
    ErrorDomain.VALIDATION,
    ErrorSeverity.LOW,
    message,
    {
      details: {
        field,
        value,
        dashboardErrorType: DashboardErrorType.DASHBOARD_VALIDATION_ERROR,
        ...details,
      },
      context: {
        component: 'Dashboard',
        operation: 'validation',
        field,
      },
      recoverable: false,
      retryable: false,
    }
  );
};

