export * from './base-error';
export * from './circuit-breaker';
export * from './error-handler';

// Re-export common error types
import { BaseError, ErrorDomain, ErrorSeverity } from './base-error';

type ErrorOptions = {
  statusCode: number;
  code: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  isOperational: boolean;
  details?: Record<string, any>;
  retryable?: boolean;
  recoveryStrategies?: Array<{
    name: string;
    description: string;
    automatic: boolean;
    action: () => Promise<void>;
  }>;
};

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 404,
      code: 'NOT_FOUND',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 403,
      code: 'FORBIDDEN',
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 409,
      code: 'CONFLICT',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      retryable: true,
      recoveryStrategies: [
        {
          name: 'wait',
          description: 'Wait and retry after the specified duration',
          automatic: true,
          action: async () => {
            const retryAfter = details?.retryAfter || 60000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
          },
        },
      ],
      ...(details && { details }),
    };
    super(message, options);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    const options: ErrorOptions = {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      isOperational: true,
      retryable: true,
      recoveryStrategies: [
        {
          name: 'retry',
          description: 'Automatic retry with exponential backoff',
          automatic: true,
          action: async () => {
            const attempt = (details?.attempt || 0) + 1;
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
          },
        },
      ],
      ...(details && { details }),
    };
    super(message, options);
  }
}
