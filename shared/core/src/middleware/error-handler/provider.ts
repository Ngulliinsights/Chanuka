import { MiddlewareProvider } from '/types';
import { Request, Response, NextFunction } from 'express';
import { createErrorMiddleware } from '../../observability/error-management/middleware/express-error-middleware.js';

export class ErrorHandlerMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'errorHandler';

  validate(options: Record<string, any>): boolean {
    return true;
  }

  create(options: Record<string, any>) {
    // Use the unified error middleware from observability/error-management
    return createErrorMiddleware({
      includeStackTrace: options?.includeStackTrace ?? process.env.NODE_ENV === 'development',
      logErrors: options?.logErrors ?? true,
      correlationIdHeader: options?.correlationIdHeader ?? 'x-correlation-id'
    });
  }
}
















































