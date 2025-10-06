import { BaseError, ErrorDomain, ErrorSeverity } from './base-error';

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
    });
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.LOW,
    });
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      details: details || {},
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}
