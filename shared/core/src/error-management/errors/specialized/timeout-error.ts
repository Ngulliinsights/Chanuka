import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class TimeoutError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 408,
      code: 'TIMEOUT_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
      ...(details && { details }),
      retryable: true,
      recoveryStrategies: [
        {
          name: 'retry',
          description: 'Retry operation after timeout',
          automatic: true,
          action: async () => {
            const attempt = (details?.attempt || 0) + 1;
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          },
        },
      ],
    });
  }

  protected override computeUserMessage(): string {
    return `Operation timed out: ${this.message}`;
  }
}