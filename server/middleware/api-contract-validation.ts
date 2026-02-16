/**
 * API Contract Validation Middleware
 * Validates requests and responses against API contract schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import {
  ApiEndpoint,
  ApiEndpointWithParams,
  ApiEndpointWithQuery,
  ApiEndpointWithParamsAndQuery,
  validateRequest,
  validateResponse,
  validateParams,
  validateQuery,
} from '@shared/types/api/contracts';
import { logger } from '@shared/core';

/**
 * Validation error details
 */
interface ValidationErrorDetail {
  readonly path: string;
  readonly message: string;
}

/**
 * Validation error response
 */
interface ValidationErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly statusCode: number;
    readonly correlationId: string;
    readonly timestamp: string;
    readonly validationErrors: readonly ValidationErrorDetail[];
  };
}

/**
 * Create validation error response
 */
function createValidationErrorResponse(
  errors: readonly ValidationErrorDetail[],
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
 * Get correlation ID from request
 */
function getCorrelationId(req: Request): string {
  return (req.headers['x-correlation-id'] as string) || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to validate request against API contract
 */
export function validateApiContract<TRequest, TResponse>(
  endpoint: ApiEndpoint<TRequest, TResponse>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // Validate request body
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        const requestValidation = validateRequest(endpoint, req.body);

        if (!requestValidation.valid) {
          logger.warn('Request validation failed', {
            correlationId,
            endpoint: endpoint.path,
            method: endpoint.method,
            errors: requestValidation.errors,
          });

          res.status(400).json(
            createValidationErrorResponse(requestValidation.errors || [], correlationId)
          );
          return;
        }

        // Attach validated data to request
        req.body = requestValidation.data;
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('API contract validation error', {
        correlationId,
        endpoint: endpoint.path,
        method: endpoint.method,
        error,
      });

      next(error);
    }
  };
}

/**
 * Middleware to validate request with path parameters
 */
export function validateApiContractWithParams<TRequest, TResponse, TParams>(
  endpoint: ApiEndpointWithParams<TRequest, TResponse, TParams>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // Validate path parameters
      const paramsValidation = validateParams(endpoint, req.params);

      if (!paramsValidation.valid) {
        logger.warn('Path parameters validation failed', {
          correlationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          errors: paramsValidation.errors,
        });

        res.status(400).json(
          createValidationErrorResponse(paramsValidation.errors || [], correlationId)
        );
        return;
      }

      // Attach validated params to request
      req.params = paramsValidation.data as Record<string, string>;

      // Validate request body if not GET/DELETE
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        const requestValidation = validateRequest(endpoint, req.body);

        if (!requestValidation.valid) {
          logger.warn('Request validation failed', {
            correlationId,
            endpoint: endpoint.path,
            method: endpoint.method,
            errors: requestValidation.errors,
          });

          res.status(400).json(
            createValidationErrorResponse(requestValidation.errors || [], correlationId)
          );
          return;
        }

        // Attach validated data to request
        req.body = requestValidation.data;
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('API contract validation error', {
        correlationId,
        endpoint: endpoint.path,
        method: endpoint.method,
        error,
      });

      next(error);
    }
  };
}

/**
 * Middleware to validate request with query parameters
 */
export function validateApiContractWithQuery<TRequest, TResponse, TQuery>(
  endpoint: ApiEndpointWithQuery<TRequest, TResponse, TQuery>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // Validate query parameters
      const queryValidation = validateQuery(endpoint, req.query);

      if (!queryValidation.valid) {
        logger.warn('Query parameters validation failed', {
          correlationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          errors: queryValidation.errors,
        });

        res.status(400).json(
          createValidationErrorResponse(queryValidation.errors || [], correlationId)
        );
        return;
      }

      // Attach validated query to request
      req.query = queryValidation.data as Record<string, unknown>;

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('API contract validation error', {
        correlationId,
        endpoint: endpoint.path,
        method: endpoint.method,
        error,
      });

      next(error);
    }
  };
}

/**
 * Middleware to validate request with both path and query parameters
 */
export function validateApiContractWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>(
  endpoint: ApiEndpointWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // Validate path parameters
      const paramsValidation = validateParams(endpoint, req.params);

      if (!paramsValidation.valid) {
        logger.warn('Path parameters validation failed', {
          correlationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          errors: paramsValidation.errors,
        });

        res.status(400).json(
          createValidationErrorResponse(paramsValidation.errors || [], correlationId)
        );
        return;
      }

      // Attach validated params to request
      req.params = paramsValidation.data as Record<string, string>;

      // Validate query parameters
      const queryValidation = validateQuery(endpoint, req.query);

      if (!queryValidation.valid) {
        logger.warn('Query parameters validation failed', {
          correlationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          errors: queryValidation.errors,
        });

        res.status(400).json(
          createValidationErrorResponse(queryValidation.errors || [], correlationId)
        );
        return;
      }

      // Attach validated query to request
      req.query = queryValidation.data as Record<string, unknown>;

      // Validate request body if not GET/DELETE
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        const requestValidation = validateRequest(endpoint, req.body);

        if (!requestValidation.valid) {
          logger.warn('Request validation failed', {
            correlationId,
            endpoint: endpoint.path,
            method: endpoint.method,
            errors: requestValidation.errors,
          });

          res.status(400).json(
            createValidationErrorResponse(requestValidation.errors || [], correlationId)
          );
          return;
        }

        // Attach validated data to request
        req.body = requestValidation.data;
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('API contract validation error', {
        correlationId,
        endpoint: endpoint.path,
        method: endpoint.method,
        error,
      });

      next(error);
    }
  };
}

/**
 * Response validation middleware (development mode only)
 * Validates response data against contract schema before sending
 */
export function validateApiResponse<TRequest, TResponse>(
  endpoint: ApiEndpoint<TRequest, TResponse>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only validate responses in development mode
    if (process.env.NODE_ENV !== 'development') {
      next();
      return;
    }

    const correlationId = getCorrelationId(req);

    // Intercept res.json to validate response
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      try {
        // Validate response data
        const responseValidation = validateResponse(endpoint, body);

        if (!responseValidation.valid) {
          logger.error('Response validation failed', {
            correlationId,
            endpoint: endpoint.path,
            method: endpoint.method,
            errors: responseValidation.errors,
            responseData: body,
          });

          // In development, return validation error
          return originalJson({
            success: false,
            error: {
              code: 'RESPONSE_VALIDATION_ERROR',
              message: 'Response validation failed (development mode)',
              statusCode: 500,
              correlationId,
              timestamp: new Date().toISOString(),
              validationErrors: responseValidation.errors,
            },
          });
        }

        // Response is valid, send it
        return originalJson(body);
      } catch (error) {
        logger.error('Response validation error', {
          correlationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          error,
        });

        // In case of error, send original response
        return originalJson(body);
      }
    };

    next();
  };
}

/**
 * Helper to create a complete validation middleware chain
 */
export function createValidationMiddleware<TRequest, TResponse>(
  endpoint: ApiEndpoint<TRequest, TResponse>
) {
  return [
    validateApiContract(endpoint),
    validateApiResponse(endpoint),
  ];
}

/**
 * Helper to create validation middleware with path parameters
 */
export function createValidationMiddlewareWithParams<TRequest, TResponse, TParams>(
  endpoint: ApiEndpointWithParams<TRequest, TResponse, TParams>
) {
  return [
    validateApiContractWithParams(endpoint),
    validateApiResponse(endpoint),
  ];
}

/**
 * Helper to create validation middleware with query parameters
 */
export function createValidationMiddlewareWithQuery<TRequest, TResponse, TQuery>(
  endpoint: ApiEndpointWithQuery<TRequest, TResponse, TQuery>
) {
  return [
    validateApiContractWithQuery(endpoint),
    validateApiResponse(endpoint),
  ];
}

/**
 * Helper to create validation middleware with both path and query parameters
 */
export function createValidationMiddlewareWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>(
  endpoint: ApiEndpointWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>
) {
  return [
    validateApiContractWithParamsAndQuery(endpoint),
    validateApiResponse(endpoint),
  ];
}
