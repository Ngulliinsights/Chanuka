/**
 * Dashboard-specific error classes
 */

import { BaseError } from './classes';
import { ErrorDomain, ErrorSeverity } from './constants';

export class DashboardError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      context: details ? { details } : undefined,
    });
    this.name = 'DashboardError';
  }
}

export class DashboardDataFetchError extends DashboardError {
  constructor(source: string, message: string, details?: Record<string, unknown>) {
    super(`Data fetch failed from ${source}: ${message}`, { source, ...details });
    this.name = 'DashboardDataFetchError';
  }
}

export class DashboardActionError extends DashboardError {
  constructor(action: string, message: string, details?: Record<string, unknown>) {
    super(`Action '${action}' failed: ${message}`, { action, ...details });
    this.name = 'DashboardActionError';
  }
}

export class DashboardTopicError extends DashboardError {
  constructor(
    operation: string,
    topicId?: string,
    message?: string,
    details?: Record<string, unknown>
  ) {
    const errorMessage = message || `Topic operation '${operation}' failed`;
    super(errorMessage, { operation, topicId, ...details });
    this.name = 'DashboardTopicError';
  }
}

export class DashboardConfigurationError extends DashboardError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Configuration error: ${message}`, details);
    this.name = 'DashboardConfigurationError';
  }
}
