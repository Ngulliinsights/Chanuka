import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class AuthenticationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 401,
      code: 'AUTHENTICATION_ERROR',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Authentication failed: ${this.message}`;
  }
}