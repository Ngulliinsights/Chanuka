import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class SystemError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'SYSTEM_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      isOperational: false,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return 'A system error occurred. Our team has been notified.';
  }
}