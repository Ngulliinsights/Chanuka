import { Request, Response, NextFunction } from 'express';

import { MiddlewareProvider } from '../types';

interface ValidationMiddlewareOptions {
  schema: any; // Simplified - actual validation should use Zod or similar
  target: 'body' | 'query' | 'params';
}

export class ValidationMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'validation';

  constructor(private readonly validator?: unknown) {}

  validate(options: ValidationMiddlewareOptions): boolean {
    const { schema, target } = options;
    return schema && ['body', 'query', 'params'].includes(target);
  }

  create(options: ValidationMiddlewareOptions) {
    const { schema, target } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dataToValidate = req[target as keyof Request];
        
        // Simplified validation - in production, use proper validation service
        if (!dataToValidate) {
          res.status(400).json({
            error: 'Validation failed',
            details: [`${target} is required`]
          });
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
















































