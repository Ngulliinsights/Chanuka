import { createErrorMiddleware, ErrorMiddlewareOptions } from '../../observability/error-management/middleware/express-error-middleware.js';
import { MiddlewareProvider } from '../../types';

export class ErrorHandlerMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'errorHandler';

  create(options: ErrorMiddlewareOptions) {
    // Use the unified error middleware from observability/error-management
    return createErrorMiddleware({
      includeStackTrace: options?.includeStackTrace ?? process.env.NODE_ENV === 'development',
      logErrors: options?.logErrors ?? true,
      correlationIdHeader: options?.correlationIdHeader ?? 'x-correlation-id'
    });
  }
}
















































