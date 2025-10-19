import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class ConfigurationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      isOperational: false,
      ...(details && { details }),
      retryable: false,
    });
  }

  protected override computeUserMessage(): string {
    return 'Configuration error detected. Please contact support.';
  }
}




































