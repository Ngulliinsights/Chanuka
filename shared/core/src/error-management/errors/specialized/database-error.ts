import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class DatabaseError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      domain: ErrorDomain.DATABASE,
      severity: ErrorSeverity.HIGH,
      isOperational: false,
      ...(details && { details }),
      retryable: true,
      recoveryStrategies: [
        {
          name: 'retry',
          description: 'Retry database operation with exponential backoff',
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
    return 'A database error occurred. Please try again later.';
  }
}