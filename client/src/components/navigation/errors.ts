/**
 * Navigation-specific error types
 * Using simplified error classes for client-side navigation
 */

export enum NavigationErrorType {
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  NAVIGATION_ITEM_NOT_FOUND = 'NAVIGATION_ITEM_NOT_FOUND',
  INVALID_NAVIGATION_PATH = 'INVALID_NAVIGATION_PATH',
  NAVIGATION_ACCESS_DENIED = 'NAVIGATION_ACCESS_DENIED',
  NAVIGATION_VALIDATION_ERROR = 'NAVIGATION_VALIDATION_ERROR',
  NAVIGATION_CONFIGURATION_ERROR = 'NAVIGATION_CONFIGURATION_ERROR'
}

export class NavigationError extends Error {
  public readonly type: NavigationErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: NavigationErrorType = NavigationErrorType.NAVIGATION_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'NavigationError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NavigationError);
    }
  }
}

export class NavigationItemNotFoundError extends NavigationError {
  constructor(path: string, details?: Record<string, any>) {
    super(
      `Navigation item not found for path: ${path}`,
      NavigationErrorType.NAVIGATION_ITEM_NOT_FOUND,
      404,
      { path, ...details }
    );
  }
}

export class InvalidNavigationPathError extends NavigationError {
  constructor(path: string, reason?: string, details?: Record<string, any>) {
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
    details?: Record<string, any>
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
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      NavigationErrorType.NAVIGATION_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class NavigationConfigurationError extends NavigationError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      NavigationErrorType.NAVIGATION_CONFIGURATION_ERROR,
      500,
      details
    );
  }
}