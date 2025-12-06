import { MiddlewareProvider } from '../types';
import { CoreValidationService as ValidationService } from '../../validation/core/validation-service';
import { Request, Response, NextFunction } from 'express';
// import { logger } from '../observability/logging'; // Unused import

export class ValidationMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'validation';

  constructor(private readonly validator: ValidationService) {}

  validate(options: Record<string, any>): boolean {
    const { schema, target } = options;
    return schema && ['body', 'query', 'params'].includes(target);
  }

  create(options: Record<string, any>) {
    const { schema, target } = options;
    
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const dataToValidate = req[target as keyof Request];
        const result = this.validator.validate(schema, dataToValidate);
        
        if (!result.valid) {
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
















































