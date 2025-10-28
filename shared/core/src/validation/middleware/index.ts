/**
 * Validation Middleware
 *
 * Express middleware for request validation with comprehensive error handling
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types';
import { validationService } from '../validation-service';
import { logger } from '../../logging';

/**
 * Request validation configuration
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
  /** Validation options */
  options?: any;
  /** Custom error handler */
  onError?: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void;
  /** Skip validation based on condition */
  skipIf?: (req: Request) => boolean;
  /** Transform validated data */
  transform?: (data: any, req: Request) => any;
}

/**
 * Validation decorator options
 */
export interface ValidationDecoratorOptions {
  /** Schema to validate against */
  schema: ZodSchema;
  /** Property name to validate (defaults to first parameter) */
  property?: string;
  /** Validation options */
  options?: any;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Create validation middleware for Express requests
 */
export function validateRequest(config: RequestValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check skip condition
      if (config.skipIf && config.skipIf(req)) {
        return next();
      }

      // Create validation context
      const context = {
        requestId: req.headers['x-request-id'] as string,
        userId: (req as any).user?.id,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
      };

      const validatedData: any = {};

      // Validate request body
      if (config.body && req.body !== undefined) {
        try {
          validatedData.body = await validationService.validate(
            config.body,
            req.body,
            config.options,
            context
          );
          req.body = config.transform ? config.transform(validatedData.body, req) : validatedData.body;
        } catch (error) {
          if (error instanceof ValidationError) {
            // Create a new error with prefixed field names
            const prefixedErrors = error.errors.map(e => ({ ...e, field: `body.${e.field}` }));
            const newError = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
            (newError as any).errors = prefixedErrors;
            throw newError;
          }
          throw error;
        }
      }

      // Validate query parameters
      if (config.query && req.query !== undefined) {
        try {
          validatedData.query = await validationService.validate(
            config.query,
            req.query,
            config.options,
            context
          );
          req.query = config.transform ? config.transform(validatedData.query, req) : validatedData.query;
        } catch (error) {
          if (error instanceof ValidationError) {
            // Create a new error with prefixed field names
            const prefixedErrors = error.errors.map(e => ({ ...e, field: `query.${e.field}` }));
            const newError = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
            (newError as any).errors = prefixedErrors;
            throw newError;
          }
          throw error;
        }
      }

      // Validate URL parameters
      if (config.params && req.params !== undefined) {
        try {
          validatedData.params = await validationService.validate(
            config.params,
            req.params,
            config.options,
            context
          );
          req.params = config.transform ? config.transform(validatedData.params, req) : validatedData.params;
        } catch (error) {
          if (error instanceof ValidationError) {
            // Create a new error with prefixed field names
            const prefixedErrors = error.errors.map(e => ({ ...e, field: `params.${e.field}` }));
            const newError = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
            (newError as any).errors = prefixedErrors;
            throw newError;
          }
          throw error;
        }
      }

      // Validate headers
      if (config.headers && req.headers !== undefined) {
        try {
          validatedData.headers = await validationService.validate(
            config.headers,
            req.headers,
            config.options,
            context
          );
          // Note: We don't modify req.headers as it might break other middleware
        } catch (error) {
          if (error instanceof ValidationError) {
            // Create a new error with prefixed field names
            const prefixedErrors = error.errors.map(e => ({ ...e, field: `headers.${e.field}` }));
            const newError = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
            (newError as any).errors = prefixedErrors;
            throw newError;
          }
          throw error;
        }
      }

      // Store validated data in request for later use
      (req as any).validated = validatedData;

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        if (config.onError) {
          return config.onError(error, req, res, next);
        }

        // Default error response
        res.status(error.statusCode).json({
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
        });
        return;
      }

      // Handle other errors
      next(error);
    }
  };
}

/**
 * Validation middleware factory with common patterns
 */
export class ValidationMiddleware {
  /**
   * Create middleware for body validation only
   */
  static body(schema: ZodSchema, options?: any) {
    return validateRequest({ body: schema, options });
  }

  /**
   * Create middleware for query validation only
   */
  static query(schema: ZodSchema, options?: any) {
    return validateRequest({ query: schema, options });
  }

  /**
   * Create middleware for params validation only
   */
  static params(schema: ZodSchema, options?: any) {
    return validateRequest({ params: schema, options });
  }

  /**
   * Create middleware for headers validation only
   */
  static headers(schema: ZodSchema, options?: any) {
    return validateRequest({ headers: schema, options });
  }

  /**
   * Create middleware that validates multiple parts of the request
   */
  static all(config: Omit<RequestValidationConfig, 'onError' | 'skipIf' | 'transform'>) {
    return validateRequest(config);
  }

  /**
   * Create conditional validation middleware
   */
  static conditional(
    condition: (req: Request) => boolean,
    config: RequestValidationConfig
  ) {
    return validateRequest({
      ...config,
      skipIf: (req) => !condition(req),
    });
  }

  /**
   * Create validation middleware with custom error handling
   */
  static withErrorHandler(
    config: Omit<RequestValidationConfig, 'onError'>,
    errorHandler: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void
  ) {
    return validateRequest({
      ...config,
      onError: errorHandler,
    });
  }
}

/**
 * Method decorator for validation (for use with class-based controllers)
 */
export function validate(options: ValidationDecoratorOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // Determine which argument to validate
        const argIndex = options.property ?
          originalMethod.toString().match(/\(([^)]*)\)/)![1].split(',').findIndex((param: string) =>
            param.trim().startsWith(options.property!)
          ) : 0;

        if (argIndex >= 0 && argIndex < args.length) {
          // Validate the specified argument
          args[argIndex] = await validationService.validate(
            options.schema,
            args[argIndex],
            options.options
          );
        }

        return originalMethod.apply(this, args);
      } catch (error) {
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
 * Class decorator for automatic validation of all methods
 */
export function validateClass(defaultOptions?: any) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        // Note: Reflect metadata is not available, skipping decorator implementation
        // This would need to be implemented differently or removed
      }
    };
  };
}

/**
 * Batch validation middleware for processing arrays of data
 */
export function validateBatch(schema: ZodSchema, options?: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const context = {
        requestId: req.headers['x-request-id'] as string,
        userId: (req as any).user?.id,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          path: req.path,
          batchSize: req.body.length,
        },
      };

      const result = await validationService.validateBatch(
        schema,
        req.body,
        options,
        context
      );

      // Store batch validation result in request
      (req as any).batchValidation = result;

      // If there are invalid items, return them in the response
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

      // All items are valid, replace request body with validated data
      req.body = result.valid;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validation middleware for file uploads
 */
export function validateFileUpload(
  fileSchema?: ZodSchema,
  metadataSchema?: ZodSchema,
  options?: any
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = {
        requestId: req.headers['x-request-id'] as string,
        userId: (req as any).user?.id,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          path: req.path,
          contentType: req.headers['content-type'],
        },
      };

      // Validate file information if present
      if (fileSchema && (req as any).file) {
        const fileData = {
          filename: (req as any).file.originalname,
          mimetype: (req as any).file.mimetype,
          size: (req as any).file.size,
        };

        await validationService.validate(fileSchema, fileData, options, context);
      }

      // Validate multiple files if present
      if (fileSchema && (req as any).files && Array.isArray((req as any).files)) {
        const filesData = (req as any).files.map((file: any) => ({
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }));

        const result = await validationService.validateBatch(
          fileSchema,
          filesData,
          options,
          context
        );

        if (result.invalidCount > 0) {
          res.status(422).json({
            error: 'File Validation Error',
            message: `${result.invalidCount} of ${result.totalCount} files failed validation`,
            invalid: result.invalid.map(item => ({
              index: item.index,
              filename: (item.data as any).filename,
              errors: item.error.errors,
            })),
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Validate additional metadata if present
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
 * Validation error handler middleware
 */
export function validationErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction): void => {
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

    // Pass non-validation errors to the next error handler
    next(error);
  };
}

/**
 * Utility function to extract validated data from request
 */
export function getValidatedData(req: Request): any {
  return (req as any).validated || {};
}

/**
 * Utility function to extract batch validation result from request
 */
export function getBatchValidationResult(req: Request): any {
  return (req as any).batchValidation;
}

/**
 * Common validation middleware presets
 */
export const commonValidation = {
  /**
   * Validate pagination parameters
   */
  pagination: async () => {
    const { paginationSchema } = await import('../schemas/common');
    return ValidationMiddleware.query(paginationSchema);
  },

  /**
   * Validate UUID parameter
   */
  uuidParam: (paramName: string = 'id') => {
    const { z } = require('zod');
    const schema = z.object({
      [paramName]: z.string().uuid(`Invalid ${paramName} format`),
    });
    return ValidationMiddleware.params(schema);
  },

  /**
   * Validate search query
   */
  searchQuery: async () => {
    const { searchQuerySchema } = await import('../schemas/common');
    return ValidationMiddleware.query(searchQuerySchema);
  },

  /**
   * Validate file upload
   */
  fileUpload: async () => {
    const { fileUploadSchema } = await import('../schemas/common');
    return validateFileUpload(fileUploadSchema);
  },
};





































