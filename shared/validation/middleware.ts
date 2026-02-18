/**
 * Validation Middleware (Server-Only)
 * 
 * Express middleware for request validation using Zod schemas.
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors/types';

type ZodSchema<T> = z.ZodType<T>;

/**
 * Middleware for Zod schema validation
 * 
 * Validates request body against a Zod schema and throws ValidationError if invalid.
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validateSchema } from '@shared/validation';
 * 
 * const userSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 * 
 * router.post('/users', validateSchema(userSchema), async (req, res) => {
 *   // req.body is now typed and validated
 *   const user = await createUser(req.body);
 *   res.json(user);
 * });
 * ```
 */
export function validateSchema<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          rule: e.code,
          message: e.message,
        }));

        next(new ValidationError(
          'Request validation failed',
          { operation: 'validateSchema', layer: 'middleware' },
          errors
        ));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validate request query parameters
 * 
 * @param schema - Zod schema for query parameters
 * @returns Express middleware function
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          rule: e.code,
          message: e.message,
        }));

        next(new ValidationError(
          'Query parameter validation failed',
          { operation: 'validateQuery', layer: 'middleware' },
          errors
        ));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validate request params
 * 
 * @param schema - Zod schema for route parameters
 * @returns Express middleware function
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          rule: e.code,
          message: e.message,
        }));

        next(new ValidationError(
          'Route parameter validation failed',
          { operation: 'validateParams', layer: 'middleware' },
          errors
        ));
      } else {
        next(err);
      }
    }
  };
}
