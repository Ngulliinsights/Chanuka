import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class NetworkError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 503,
      code: 'NETWORK_ERROR',
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      isOperational: false,
      ...(details && { details }),
      retryable: true,
      recoveryStrategies: [
        {
          name: 'retry',
          description: 'Retry network operation with exponential backoff',
          automatic: true,
          action: async () => {
            const attempt = (details?.attempt || 0) + 1;
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
          },
        },
      ],
    });
  }

  protected override computeUserMessage(): string {
    return 'Network connection failed. Please check your connection and try again.';
  }
}