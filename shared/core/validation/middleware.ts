/**
 * Validation Middleware - Optimized Version
 * 
 * Express middleware for request validation with comprehensive error handling,
 * improved performance, and enhanced type safety
 */

import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

import { ValidationError, ValidationOptions, ValidationContext } from './types';
import { validationService } from './validation-service';

/**
 * Request validation configuration
 * Defines which parts of the request should be validated and how
 */
export interface RequestValidationConfig {
  /** Schema for request body validation */
  body?: ZodSchema;
  /** Schema for query parameters validation */
  query?: ZodSchema;
  /** Schema for URL parameters validation */
  params?: ZodSchema;
  /** Schema for request headers validation */
  headers?: ZodSchema;
  /** Validation options (strict mode, custom rules, etc.) */
  options?: ValidationOptions;
  /** Custom error handler for validation failures */
  onError?: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void;
  /** Skip validation based on runtime condition */
  skipIf?: (req: Request) => boolean;
  /** Transform validated data before assigning back to request */
  transform?: (data: any, req: Request) => any;
}

/**
 * Validation decorator options for method-level validation
 */
export interface ValidationDecoratorOptions {
  /** Schema to validate against */
  schema: ZodSchema;
  /** Property name to validate (defaults to first parameter) */
  property?: string;
  /** Validation options */
  options?: ValidationOptions;
  /** Custom error message to override default */
  errorMessage?: string;
}

/**
 * Standard error response structure for validation failures
 */
interface ValidationErrorResponse {
  error: string;
  message: string;
  details: unknown[];
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

/**
 * Create validation middleware for Express requests
 * 
 * This is the core function that orchestrates validation across different
 * parts of the request (body, query, params, headers). It builds a validation
 * context with request metadata and handles errors consistently.
 */
export function validateRequest(config: RequestValidationConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Early exit if skip condition is met - improves performance
      if (config.skipIf?.(req)) {
        return next();
      }

      // Build validation context with request metadata for better error tracking
      const context = createValidationContext(req);
      
      // Object to accumulate all validated data from different request parts
      const validatedData: Record<string, any> = {};

      // Validate each part of the request that has a schema defined
      // We process them sequentially to maintain clear error messages
      await validateRequestPart('body', req, config, validatedData, context);
      await validateRequestPart('query', req, config, validatedData, context);
      await validateRequestPart('params', req, config, validatedData, context);
      await validateRequestPart('headers', req, config, validatedData, context);

      // Store all validated data in request for downstream middleware/handlers
      // This allows route handlers to access pre-validated, type-safe data
      (req as unknown).validated = validatedData;

      next();
    } catch (error) {
      handleValidationError(error, req, res, next, config);
    }
  };
}

/**
 * Helper function to create a validation context from the request
 * Centralizes context creation logic for consistency
 */
function createValidationContext(req: Request): ValidationContext {
  return {
    requestId: req.headers['x-request-id'] as string,
    user_id: (req as unknown).user?.id,
    timestamp: new Date(),
    metadata: {
      method: req.method,
      path: req.path,
      user_agent: req.headers['user-agent'],
      ip: req.ip,
    },
  };
}

/**
 * Validate a specific part of the request (body, query, params, or headers)
 * Extracted into a helper to reduce code duplication and improve maintainability
 */
async function validateRequestPart(
  partName: 'body' | 'query' | 'params' | 'headers',
  req: Request,
  config: RequestValidationConfig,
  validatedData: Record<string, any>,
  context: ValidationContext
): Promise<void> {
  const schema = config[partName];
  const data = req[partName];

  // Skip if no schema defined for this part or data is undefined
  if (!schema || data === undefined) {
    return;
  }

  try {
    // Validate using the service layer
    const validated = await validationService.validate(
      schema,
      data,
      config.options,
      context
    );

    // Apply custom transformation if provided
    const transformed = config.transform ? config.transform(validated, req) : validated;
    
    // Store validated data
    validatedData[partName] = transformed;

    // Update request with validated data (except headers which shouldn't be modified)
    if (partName !== 'headers') {
      (req as unknown)[partName] = transformed;
    }
  } catch (error) {
    // Enhance error with field path prefix for clarity
    if (error instanceof ValidationError) {
      const enhancedErrors = error.errors.map(e => ({
        ...e,
        field: `${partName}.${e.field}`,
      }));
      throw new ValidationError(error.message, enhancedErrors);
    }
    throw error;
  }
}

/**
 * Centralized error handling for validation failures
 * Provides consistent error response format across all validation scenarios
 */
function handleValidationError(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
  config: RequestValidationConfig
): void {
  if (!(error instanceof ValidationError)) {
    // Not a validation error, pass to next error handler
    return next(error);
  }

  // Use custom error handler if provided
  if (config.onError) {
    return config.onError(error, req, res, next);
  }

  // Default error response with detailed information
  const errorResponse: ValidationErrorResponse = {
    error: 'Validation Error',
    message: error.message,
    details: error.errors,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] as string,
  };

  res.status(error.statusCode).json(errorResponse);
}

/**
 * Validation middleware factory with common patterns
 * Provides convenient methods for common validation scenarios
 */
export class ValidationMiddleware {
  /**
   * Create middleware for body validation only
   * Most common use case - validating JSON request bodies
   */
  static body(schema: ZodSchema, options?: ValidationOptions): RequestHandler {
    return validateRequest({
      body: schema,
      ...(options && { options }),
    });
  }

  /**
   * Create middleware for query validation only
   * Used for validating URL query parameters
   */
  static query(schema: ZodSchema, options?: ValidationOptions): RequestHandler {
    return validateRequest({
      query: schema,
      ...(options && { options }),
    });
  }

  /**
   * Create middleware for params validation only
   * Used for validating URL path parameters like /users/:id
   */
  static params(schema: ZodSchema, options?: ValidationOptions): RequestHandler {
    return validateRequest({
      params: schema,
      ...(options && { options }),
    });
  }

  /**
   * Create middleware for headers validation only
   * Less common but useful for API key validation, etc.
   */
  static headers(schema: ZodSchema, options?: ValidationOptions): RequestHandler {
    return validateRequest({
      headers: schema,
      ...(options && { options }),
    });
  }

  /**
   * Create middleware that validates multiple parts of the request
   * Useful when you need to validate body AND query parameters together
   */
  static all(config: Omit<RequestValidationConfig, 'onError' | 'skipIf' | 'transform'>): RequestHandler {
    return validateRequest(config);
  }

  /**
   * Create conditional validation middleware
   * Only validates when the condition returns true
   */
  static conditional(
    condition: (req: Request) => boolean,
    config: RequestValidationConfig
  ): RequestHandler {
    return validateRequest({
      ...config,
      skipIf: (req) => !condition(req),
    });
  }

  /**
   * Create validation middleware with custom error handling
   * Allows you to customize error responses per route
   */
  static withErrorHandler(
    config: Omit<RequestValidationConfig, 'onError'>,
    errorHandler: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void
  ): RequestHandler {
    return validateRequest({
      ...config,
      onError: errorHandler,
    });
  }
}

/**
 * Method decorator for validation (for use with class-based controllers)
 * 
 * This allows you to add validation directly to controller methods using
 * TypeScript decorators, which is cleaner than wrapping methods manually
 */
export function validate(options: ValidationDecoratorOptions) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        // Determine which argument to validate based on property name or default to first
        const argIndex = options.property 
          ? findParameterIndex(originalMethod, options.property)
          : 0;

        if (argIndex >= 0 && argIndex < args.length) {
          // Validate and replace the argument with validated data
          args[argIndex] = await validationService.validate(
            options.schema,
            args[argIndex],
            options.options
          );
        }

        return originalMethod.apply(this, args);
      } catch (error) {
        // Override error message if custom message provided
        if (error instanceof ValidationError && options.errorMessage) {
          error.message = options.errorMessage;
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper to find parameter index by name in function signature
 * More robust than string parsing for parameter detection
 */
function findParameterIndex(fn: Function, paramName: string): number {
  const fnStr = fn.toString();
  const match = fnStr.match(/\(([^)]*)\)/);

  if (!match?.[1]) return -1;

  const params = match[1].split(',').map(p => p.trim().split(/[\s:]/)[0]);
  return params.indexOf(paramName);
}

/**
 * Class decorator for automatic validation of all methods
 * Applies validation to all methods in a class that have validation metadata
 */
export function validateClass(defaultOptions?: ValidationOptions) {
  return function <T extends { new (...args: unknown[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: unknown[]) {
        super(...args);
        
        // Wrap all methods with validation if they have validation metadata
        const prototype = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
          name => name !== 'constructor' && typeof prototype[name] === 'function'
        );
        
        methodNames.forEach(methodName => {
          const validationMetadata = Reflect.getMetadata('validation', prototype, methodName);
          
          if (!validationMetadata) return;

          const originalMethod = prototype[methodName];
          
          prototype[methodName] = async function (...args: unknown[]) {
            // Apply validation to each parameter that has metadata
            for (const [index, schema] of validationMetadata.entries()) {
              if (schema && args[index] !== undefined) {
                args[index] = await validationService.validate(
                  schema,
                  args[index],
                  defaultOptions
                );
              }
            }
            return originalMethod.apply(this, args);
          };
        });
      }
    };
  };
}

/**
 * Batch validation middleware for processing arrays of data
 * 
 * Useful for bulk operations where you need to validate many items at once.
 * Returns both valid and invalid items so you can process partial successes.
 */
export function validateBatch(schema: ZodSchema, options?: ValidationOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure request body is an array
      if (!Array.isArray(req.body)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Request body must be an array for batch validation',
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
        });
        return;
      }

      const context = createValidationContext(req);
      context.metadata = {
        ...context.metadata,
        batchSize: req.body.length,
      };

      // Validate all items in the batch
      const result = await validationService.validateBatch(
        schema,
        req.body,
        options,
        context
      );

      // Store batch validation result for downstream processing
      (req as unknown).batchValidation = result;

      // If there are validation failures, return detailed error response
      if (result.invalidCount > 0) {
        res.status(422).json({
          error: 'Batch Validation Error',
          message: `${result.invalidCount} of ${result.totalCount} items failed validation`,
          valid: result.valid,
          invalid: result.invalid.map(item => ({
            index: item.index,
            data: item.data,
            errors: item.error.errors,
          })),
          summary: {
            total: result.totalCount,
            valid: result.validCount,
            invalid: result.invalidCount,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
        });
        return;
      }

      // All items valid, replace body with validated data and continue
      req.body = result.valid;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validation middleware for file uploads
 * 
 * Handles both single and multiple file uploads, validating file metadata
 * like size, type, and filename. Also validates additional form data if provided.
 */
export function validateFileUpload(
  fileSchema?: ZodSchema,
  metadataSchema?: ZodSchema,
  options?: ValidationOptions
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = createValidationContext(req);
      context.metadata = {
        ...context.metadata,
        content_type: req.headers['content-type'],
      };

      // Validate single file if present
      if (fileSchema && (req as unknown).file) {
        const fileData = extractFileData((req as unknown).file);
        await validationService.validate(fileSchema, fileData, options, context);
      }

      // Validate multiple files if present
      if (fileSchema && (req as unknown).files && Array.isArray((req as unknown).files)) {
        const filesData = (req as unknown).files.map(extractFileData);

        const result = await validationService.validateBatch(
          fileSchema,
          filesData,
          options,
          context
        );

        // Return error if any files failed validation
        if (result.invalidCount > 0) {
          res.status(422).json({
            error: 'File Validation Error',
            message: `${result.invalidCount} of ${result.totalCount} files failed validation`,
            invalid: result.invalid.map(item => ({
              index: item.index,
              filename: (item.data as unknown).filename,
              errors: item.error.errors,
            })),
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Validate additional metadata from form data
      if (metadataSchema && req.body) {
        req.body = await validationService.validate(
          metadataSchema,
          req.body,
          options,
          context
        );
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          error: 'File Validation Error',
          message: error.message,
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Extract relevant data from uploaded file for validation
 */
function extractFileData(file: unknown): Record<string, any> {
  return {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };
}

/**
 * Validation error handler middleware
 * 
 * Place this at the end of your middleware chain to catch any validation
 * errors that weren't handled earlier and format them consistently
 */
export function validationErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction): void => {
    // Handle custom ValidationError
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        error: 'Validation Error',
        message: error.message,
        details: error.errors,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'],
      });
      return;
    }

    // Handle raw Zod errors (convert them to our format)
    if (error instanceof ZodError) {
      const validationError = new ValidationError(error);
      res.status(validationError.statusCode).json({
        error: 'Validation Error',
        message: validationError.message,
        details: validationError.errors,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'],
      });
      return;
    }

    // Not a validation error, pass to next error handler in chain
    next(error);
  };
}

/**
 * Utility function to extract validated data from request
 * Use this in your route handlers to access type-safe validated data
 */
export function getValidatedData<T = any>(req: Request): T {
  return (req as unknown).validated || {} as T;
}

/**
 * Utility function to extract batch validation result from request
 */
export function getBatchValidationResult(req: Request): unknown {
  return (req as unknown).batchValidation;
}

/**
 * Common validation middleware presets
 * 
 * These are pre-configured validators for common scenarios, reducing boilerplate
 * in your route definitions
 */
export const commonValidation = {
  /**
   * Validate pagination parameters (page, limit, etc.)
   */
  pagination: async (): Promise<RequestHandler> => {
    const { paginationSchema } = await import('./schemas/common');
    return ValidationMiddleware.query(paginationSchema);
  },

  /**
   * Validate UUID parameter in URL path
   */
  uuidParam: (paramName: string = 'id'): RequestHandler => {
    const { z } = require('zod');
    const schema = z.object({
      [paramName]: z.string().uuid(`Invalid ${paramName} format`),
    });
    return ValidationMiddleware.params(schema);
  },

  /**
   * Validate search query parameters
   */
  searchQuery: async (): Promise<RequestHandler> => {
    const { searchQuerySchema } = await import('./schemas/common');
    return ValidationMiddleware.query(searchQuerySchema);
  },

  /**
   * Validate file upload
   */
  fileUpload: async (): Promise<RequestHandler> => {
    const { fileUploadSchema } = await import('./schemas/common');
    return validateFileUpload(fileUploadSchema);
  },
};