import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class AuthorizationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 403,
      code: 'AUTHORIZATION_ERROR',
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Access denied: ${this.message}`;
  }
}




































