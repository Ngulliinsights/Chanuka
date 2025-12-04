import { Request, Response, NextFunction } from 'express';

import { MiddlewareProvider } from '../../types';
import { ValidationSchema } from '../../validation/core/interfaces';
import { CoreValidationService as ValidationService } from '../../validation/core/validation-service';

interface ValidationMiddlewareOptions {
  schema: ValidationSchema;
  target: 'body' | 'query' | 'params';
}
// import { logger } from '../observability/logging'; // Unused import

export class ValidationMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'validation';

  constructor(private readonly validator: ValidationService) {}

  validate(options: ValidationMiddlewareOptions): boolean {
    const { schema, target } = options;
    return schema && ['body', 'query', 'params'].includes(target);
  }

  create(options: ValidationMiddlewareOptions) {
    const { schema, target } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dataToValidate = req[target as keyof Request];
        const result = await this.validator.validateSafe(schema, dataToValidate);

        if (!result.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: result.errors
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
















































