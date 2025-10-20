import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class UnsupportedMediaTypeError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return `Unsupported media type: ${this.message}`;
  }
}




































