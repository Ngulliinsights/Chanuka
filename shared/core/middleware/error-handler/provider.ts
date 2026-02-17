import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

import { MiddlewareProvider } from '../types';

export class ErrorHandlerMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'errorHandler';

  validate(_options: Record<string, unknown>): boolean {
    return true;
  }

  create(options: Record<string, unknown>): ErrorRequestHandler {
    const includeStackTrace = options?.includeStackTrace ?? process.env.NODE_ENV === 'development';
    
    return (error: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', error);
      
      const statusCode = (error as any).statusCode || 500;
      const response: any = {
        error: error.message || 'Internal server error',
        code: (error as any).code || 'INTERNAL_ERROR'
      };

      if (includeStackTrace) {
        response.stack = error.stack;
      }

      res.status(statusCode).json(response);
    };
  }
}
















































