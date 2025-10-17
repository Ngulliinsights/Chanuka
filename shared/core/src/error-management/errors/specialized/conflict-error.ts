import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Conflict detected: ${this.message}`;
  }
}