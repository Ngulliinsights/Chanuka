/**
 * Navigation-specific error types
 * 
 * Uses shared BaseError from dashboard/errors.ts (canonical source)
 * to unify the error hierarchy across the application.
 */

import { BaseError, ErrorDomain, ErrorSeverity } from '@client/lib/ui/dashboard/errors';
import type { ErrorContext } from '@client/lib/ui/dashboard/errors';

export enum NavigationErrorType {
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  NAVIGATION_ITEM_NOT_FOUND = 'NAVIGATION_ITEM_NOT_FOUND',
  INVALID_NAVIGATION_PATH = 'INVALID_NAVIGATION_PATH',
  NAVIGATION_ACCESS_DENIED = 'NAVIGATION_ACCESS_DENIED',
  NAVIGATION_VALIDATION_ERROR = 'NAVIGATION_VALIDATION_ERROR',
  NAVIGATION_CONFIGURATION_ERROR = 'NAVIGATION_CONFIGURATION_ERROR',
}

export class NavigationError extends BaseError {
  public readonly type: NavigationErrorType;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: NavigationErrorType = NavigationErrorType.NAVIGATION_ERROR,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message, {
      statusCode,
      code: type,
      domain: ErrorDomain.UI,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: true,
      context: {
        component: 'Navigation',
        ...details,
      } as ErrorContext,
    });
    Object.defineProperty(this, 'name', { value: 'NavigationError', writable: true });
    this.type = type;
    this.details = details;
    this.isOperational = true;
  }
}

export class NavigationItemNotFoundError extends NavigationError {
  constructor(path: string, details?: Record<string, unknown>) {
    super(
      `Navigation item not found for path: ${path}`,
      NavigationErrorType.NAVIGATION_ITEM_NOT_FOUND,
      404,
      { path, ...details }
    );
  }
}

export class InvalidNavigationPathError extends NavigationError {
  constructor(path: string, reason?: string, details?: Record<string, unknown>) {
    super(
      `Invalid navigation path: ${path}${reason ? ` - ${reason}` : ''}`,
      NavigationErrorType.INVALID_NAVIGATION_PATH,
      400,
      { path, reason, ...details }
    );
  }
}

export class NavigationAccessDeniedError extends NavigationError {
  constructor(
    path: string,
    reason: string,
    requiredRole?: string[],
    details?: Record<string, unknown>
  ) {
    super(
      `Access denied to navigation path: ${path} - ${reason}`,
      NavigationErrorType.NAVIGATION_ACCESS_DENIED,
      403,
      { path, reason, requiredRole, ...details }
    );
  }
}

export class NavigationValidationError extends NavigationError {
  constructor(message: string, field: string, value: unknown, details?: Record<string, unknown>) {
    super(message, NavigationErrorType.NAVIGATION_VALIDATION_ERROR, 422, {
      field,
      value,
      ...details,
    });
  }
}

export class NavigationConfigurationError extends NavigationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, NavigationErrorType.NAVIGATION_CONFIGURATION_ERROR, 500, details);
  }
}
