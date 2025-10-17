import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class InternalServerError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      isOperational: false,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return 'An internal server error occurred. Please try again later.';
  }
}