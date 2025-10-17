import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class PayloadTooLargeError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Payload too large: ${this.message}`;
  }
}