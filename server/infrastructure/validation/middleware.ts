/**
 * Validation Middleware (Server-Only)
 * 
 * Express middleware for request validation using Zod schemas.
 * Moved from shared/validation/middleware.ts in Phase 2A.
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

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
 * import { validateSchema } from '@server/infrastructure/validation';
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
  return (req: Request, _res: Response, next: NextFunction) => {
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

        // Create validation error without ErrorContext (server-specific)
        const error = new Error('Request validation failed') as any;
        error.name = 'ValidationError';
        error.errors = errors;
        error.statusCode = 400;
        next(error);
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
  return (req: Request, _res: Response, next: NextFunction) => {
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

        const error = new Error('Query parameter validation failed') as any;
        error.name = 'ValidationError';
        error.errors = errors;
        error.statusCode = 400;
        next(error);
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
  return (req: Request, _res: Response, next: NextFunction) => {
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

        const error = new Error('Route parameter validation failed') as any;
        error.name = 'ValidationError';
        error.errors = errors;
        error.statusCode = 400;
        next(error);
      } else {
        next(err);
      }
    }
  };
}

/**
 * Alias for validateSchema (backward compatibility)
 */
export const validateBody = validateSchema;
