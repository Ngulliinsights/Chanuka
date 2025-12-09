/**
 * Dashboard-specific error types
 * Following navigation component error patterns
 */

export enum DashboardErrorType {
  DASHBOARD_ERROR = 'DASHBOARD_ERROR',
  DASHBOARD_DATA_FETCH_ERROR = 'DASHBOARD_DATA_FETCH_ERROR',
  DASHBOARD_VALIDATION_ERROR = 'DASHBOARD_VALIDATION_ERROR',
  DASHBOARD_CONFIGURATION_ERROR = 'DASHBOARD_CONFIGURATION_ERROR',
  DASHBOARD_ACTION_ERROR = 'DASHBOARD_ACTION_ERROR',
  DASHBOARD_TOPIC_ERROR = 'DASHBOARD_TOPIC_ERROR'
}

export class DashboardError extends Error {
  public readonly type: DashboardErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: DashboardErrorType = DashboardErrorType.DASHBOARD_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DashboardError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DashboardError);
    }
  }
}

export class DashboardDataFetchError extends DashboardError {
  constructor(endpoint: string, reason?: string, details?: Record<string, any>) {
    super(
      `Failed to fetch dashboard data from ${endpoint}${reason ? `: ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR,
      500,
      { endpoint, reason, ...details }
    );
  }
}

export class DashboardValidationError extends DashboardError {
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      DashboardErrorType.DASHBOARD_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class DashboardConfigurationError extends DashboardError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      DashboardErrorType.DASHBOARD_CONFIGURATION_ERROR,
      500,
      details
    );
  }
}

export class DashboardActionError extends DashboardError {
  constructor(action: string, reason?: string, details?: Record<string, any>) {
    super(
      `Dashboard action failed: ${action}${reason ? ` - ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_ACTION_ERROR,
      400,
      { action, reason, ...details }
    );
  }
}

export class DashboardTopicError extends DashboardError {
  constructor(operation: string, topicId?: string, reason?: string, details?: Record<string, any>) {
    super(
      `Topic ${operation} failed${topicId ? ` for topic ${topicId}` : ''}${reason ? `: ${reason}` : ''}`,
      DashboardErrorType.DASHBOARD_TOPIC_ERROR,
      400,
      { operation, topicId, reason, ...details }
    );
  }
}

