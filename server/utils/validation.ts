import { ValidationError } from '@shared/core';
import { logger } from '@server/infrastructure/observability';
import { NextFunction, Request, Response } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z, ZodError } from 'zod';

// Re-export shared validators
export {
  validateEmail,
  validatePassword,
  validateBillNumber,
} from '@shared/validation/validators';

// Re-export shared middleware
export {
  validateSchema,
  validateQuery,
  validateParams,
} from '@server/infrastructure/validation/middleware';

type ZodSchema<T> = z.ZodType<T>;

type ValidationDecorator<T> = (
  target: T,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

/**
 * Decorator for method parameter validation
 * @deprecated Use Zod schemas with validateSchema middleware instead
 */
export const validate = (fields: string | string[]): ValidationDecorator<any> => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    const fieldsToValidate = Array.isArray(fields) ? fields : [fields];

    descriptor.value = function (...args: unknown[]) {
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
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}














































