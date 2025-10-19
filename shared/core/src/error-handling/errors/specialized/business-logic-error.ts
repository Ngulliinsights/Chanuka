import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class BusinessLogicError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 422,
      code: 'BUSINESS_LOGIC_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Business rule violation: ${this.message}`;
  }
}




































