/**
 * Validation Middleware
 * 
 * Centralized validation middleware for request validation using Zod schemas.
 * Validates request bodies, query params, and path params against shared validation schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@shared/core';

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Standardized validation error response
 */
export interface ValidationErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: 'VALIDATION_ERROR';
    readonly message: string;
    readonly statusCode: 400;
    readonly correlationId: string;
    readonly timestamp: string;
    readonly validationErrors: readonly ValidationErrorDetail[];
  };
}

/**
 * Get correlation ID from request or generate one
 */
function getCorrelationId(req: Request): string {
  return (
    (req.headers['x-correlation-id'] as string) ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
}

/**
 * Transform Zod errors to validation error details
 */
function transformZodErrors(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Create standardized validation error response
 */
function createValidationErrorResponse(
  errors: ValidationErrorDetail[],
  correlationId: string
): ValidationErrorResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      correlationId,
      timestamp: new Date().toISOString(),
      validationErrors: errors,
    },
  };
}

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Target to validate (body, query, or params) */
  target?: ValidationTarget;
  /** Whether to strip unknown fields */
  stripUnknown?: boolean;
  /** Whether to log validation failures */
  logFailures?: boolean;
}

/**
 * Middleware to validate request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * // Validate request body
 * router.post('/users', validateRequest(UserSchema), createUser);
 * 
 * @example
 * // Validate query params
 * router.get('/users', validateRequest(ListUsersQuerySchema, { target: 'query' }), listUsers);
 * 
 * @example
 * // Validate path params
 * router.get('/users/:id', validateRequest(GetUserParamsSchema, { target: 'params' }), getUser);
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    target = 'body',
    stripUnknown = true,
    logFailures = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = getCorrelationId(req);

    try {
      // Get data to validate based on target
      const dataToValidate = req[target];

      // Validate data against schema
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const validationErrors = transformZodErrors(result.error);

        if (logFailures) {
          logger.warn('Request validation failed', {
            correlationId,
            path: req.path,
            method: req.method,
            target,
            errors: validationErrors,
          });
        }

        res.status(400).json(
          createValidationErrorResponse(validationErrors, correlationId)
        );
        return;
      }

      // Replace request data with validated data
      // This ensures type safety and strips unknown fields if configured
      (req as Record<string, unknown>)[target] = result.data;

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        correlationId,
        path: req.path,
        method: req.method,
        target,
        error,
      });

      next(error);
    }
  };
}

/**
 * Middleware to validate request body
 * Convenience wrapper for validateRequest with target='body'
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.post('/users', validateBody(CreateUserRequestSchema), createUser);
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return validateRequest(schema, { target: 'body' });
}

/**
 * Middleware to validate query parameters
 * Convenience wrapper for validateRequest with target='query'
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.get('/users', validateQuery(ListUsersQuerySchema), listUsers);
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return validateRequest(schema, { target: 'query' });
}

/**
 * Middleware to validate path parameters
 * Convenience wrapper for validateRequest with target='params'
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.get('/users/:id', validateParams(GetUserParamsSchema), getUser);
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return validateRequest(schema, { target: 'params' });
}

/**
 * Middleware to validate multiple targets at once
 * 
 * @param schemas - Object mapping targets to schemas
 * @returns Express middleware function
 * 
 * @example
 * router.put(
 *   '/users/:id',
 *   validateMultiple({
 *     params: GetUserParamsSchema,
 *     body: UpdateUserRequestSchema
 *   }),
 *   updateUser
 * );
 */
export function validateMultiple(schemas: {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = getCorrelationId(req);
    const allErrors: ValidationErrorDetail[] = [];

    try {
      // Validate each target
      for (const [target, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        const dataToValidate = req[target as ValidationTarget];
        const result = schema.safeParse(dataToValidate);

        if (!result.success) {
          const errors = transformZodErrors(result.error);
          // Prefix field names with target for clarity
          allErrors.push(
            ...errors.map((err) => ({
              ...err,
              field: `${target}.${err.field}`,
            }))
          );
        } else {
          // Replace with validated data
          req[target as ValidationTarget] = result.data;
        }
      }

      // If any validation failed, return error
      if (allErrors.length > 0) {
        logger.warn('Request validation failed', {
          correlationId,
          path: req.path,
          method: req.method,
          errors: allErrors,
        });

        res.status(400).json(
          createValidationErrorResponse(allErrors, correlationId)
        );
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        correlationId,
        path: req.path,
        method: req.method,
        error,
      });

      next(error);
    }
  };
}
