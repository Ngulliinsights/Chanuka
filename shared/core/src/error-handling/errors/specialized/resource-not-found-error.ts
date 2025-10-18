import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class ResourceNotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Resource not found: ${this.message}`;
  }
}