import { MiddlewareProvider } from '../types';
import { Request, Response, NextFunction } from 'express';

export class ErrorHandlerMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'errorHandler';

  validate(options: Record<string, any>): boolean {
    return true;
  }

  create(options: Record<string, any>) {
    return (error: Error, req: Request, res: Response, next: NextFunction): void => {
      // Log the error
      console.error('Unhandled error:', error);

      // Send error response
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
      });
    };
  }
}
