import { BaseError, ErrorDomain, ErrorSeverity } from '../../../primitives/errors';

export class RateLimitError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 429,
      code: 'RATE_LIMIT_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.LOW,
      isOperational: true,
      ...(details && { details }),
      retryable: true,
      recoveryStrategies: [
        {
          name: 'wait',
          description: 'Wait for the specified duration before retrying',
          automatic: true,
          action: async () => {
            const retryAfter = details?.retryAfter || 60000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
          },
        },
      ],
    });
  }

  protected override computeUserMessage(): string {
    return `Rate limit exceeded: ${this.message}`;
  }
}




































