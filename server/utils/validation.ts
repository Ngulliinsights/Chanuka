import { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { ValidationError } from '../../shared/types/errors.js';

type ZodSchema<T> = z.ZodType<T>;

type ValidationDecorator<T> = (
  target: T,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

/**
 * Decorator for method parameter validation
 */
export const validate = (fields: string | string[]): ValidationDecorator<any> => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    const fieldsToValidate = Array.isArray(fields) ? fields : [fields];

    descriptor.value = function (...args: any[]) {
      fieldsToValidate.forEach((field, index) => {
        if (args[index] === undefined || args[index] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      });
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};

/**
 * Middleware for Zod schema validation
 */
export function validateSchema<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed'));
      } else {
        next(err);
      }
    }
  };
}
