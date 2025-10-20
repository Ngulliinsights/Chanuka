/**
 * Enhanced Error Classes matching reference implementation
 */

export class BaseError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'BaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, public errors: any[]) {
    super(message, 422, 'VALIDATION_ERROR', { errors });
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} with id '${identifier}' not found` : `${resource} not found`,
      404, 
      'NOT_FOUND',
      { resource, identifier }
    );
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Insufficient permissions', requiredPermissions?: string[]) {
    super(message, 403, 'FORBIDDEN', { requiredPermissions });
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, conflictingResource?: string) {
    super(message, 409, 'CONFLICT', { conflictingResource });
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS', { retryAfter });
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message = 'Service temporarily unavailable', retryAfter?: number) {
    super(message, 503, 'SERVICE_UNAVAILABLE', { retryAfter });
  }
}











































