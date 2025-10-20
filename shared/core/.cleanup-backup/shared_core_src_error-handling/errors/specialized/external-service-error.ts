import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class ExternalServiceError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      domain: ErrorDomain.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      isOperational: false,
      ...(details && { details }),
      retryable: true,
      recoveryStrategies: [
        {
          name: 'retry',
          description: 'Retry external service call with exponential backoff',
          automatic: true,
          action: async () => {
            const attempt = (details?.attempt || 0) + 1;
            const delay = Math.min(2000 * Math.pow(2, attempt), 60000);
            await new Promise(resolve => setTimeout(resolve, delay));
          },
        },
      ],
    });
  }

  protected override computeUserMessage(): string {
    return 'External service is currently unavailable. Please try again later.';
  }
}




































