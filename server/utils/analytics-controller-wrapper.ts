import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ApiValidationError, ApiError, ApiSuccess } from './api-response.js';
import { logger   } from '../../shared/core/src/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Options for configuring the controller wrapper
 */
export interface ControllerWrapperOptions<TBody = any, TQuery = any, TParams = any> {
  /** Zod schema for validating request body */
  bodySchema?: z.ZodSchema<TBody>;
  /** Zod schema for validating query parameters */
  querySchema?: z.ZodSchema<TQuery>;
  /** Zod schema for validating route parameters */
  paramsSchema?: z.ZodSchema<TParams>;
}

/**
 * Type for controller handler functions
 */
export type ControllerHandler<
  TBody = any,
  TQuery = any,
  TParams = any,
  TOutput = any
> = (
  input: {
    body: TBody;
    query: TQuery;
    params: TParams;
  },
  req: AuthenticatedRequest,
  res: Response
) => Promise<TOutput>;

/**
 * Controller wrapper that provides consistent validation, error handling, and response formatting
 *
 * @param options Configuration options for validation schemas
 * @param handler The controller handler function
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const getMetricsSchema = z.object({
 *   start_date: z.string().datetime().optional(),
 *   end_date: z.string().datetime().optional(),
 *   limit: z.string().transform(val => parseInt(val)).optional()
 * });
 *
 * router.get('/metrics',
 *   controllerWrapper({ querySchema: getMetricsSchema }, async (input, req) => {
 *     return await analyticsService.getMetrics(input.query);
 *   })
 * );
 * ```
 */
export function controllerWrapper<
  TBody = any,
  TQuery = any,
  TParams = any,
  TOutput = any
>(
  options: ControllerWrapperOptions<TBody, TQuery, TParams>,
  handler: ControllerHandler<TBody, TQuery, TParams, TOutput>
) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Validate request body if schema provided
      let validatedBody: TBody = {} as TBody;
      if (options.bodySchema) {
        try {
          validatedBody = options.bodySchema.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            return res.status(400).json({
              success: false,
              error: { message: 'Validation failed', errors: error.errors, statusCode: 400 },
              metadata: {
                timestamp: new Date().toISOString(),
                requestId: req.analyticsContext?.traceId,
                source: 'database',
                executionTime: Date.now() - startTime
              }
            });
          }
          throw error;
        }
      }

      // Validate query parameters if schema provided
      let validatedQuery: TQuery = {} as TQuery;
      if (options.querySchema) {
        try {
          validatedQuery = options.querySchema.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            return res.status(400).json({
              success: false,
              error: { message: 'Validation failed', errors: error.errors, statusCode: 400 },
              metadata: {
                timestamp: new Date().toISOString(),
                requestId: req.analyticsContext?.traceId,
                source: 'database',
                executionTime: Date.now() - startTime
              }
            });
          }
          throw error;
        }
      }

      // Validate route parameters if schema provided
      let validatedParams: TParams = {} as TParams;
      if (options.paramsSchema) {
        try {
          validatedParams = options.paramsSchema.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            return res.status(400).json({
              success: false,
              error: { message: 'Validation failed', errors: error.errors, statusCode: 400 },
              metadata: {
                timestamp: new Date().toISOString(),
                requestId: req.analyticsContext?.traceId,
                source: 'validation',
                executionTime: Date.now() - startTime
              }
            });
          }
          throw error;
        }
      }

      // Merge validated inputs
      const input = {
        body: validatedBody,
        query: validatedQuery,
        params: validatedParams
      };

      // Call the handler with validated input
      const result = await handler(input, req, res);

      // Return successful response
      return res.status(200).json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.analyticsContext?.traceId,
          source: 'database',
          executionTime: Date.now() - startTime
        }
      });

    } catch (error) {
      // Log the error with context
      logger.error('Controller error', {
        component: 'analytics-controller-wrapper',
        traceId: req.analyticsContext?.traceId,
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Return error response
      return res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal server error', statusCode: 500 },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.analyticsContext?.traceId,
          source: 'controller',
          executionTime: Date.now() - startTime
        }
      });
    }
  };
}

/**
 * Extended Request interface for analytics context
 * This should be imported where Request types are extended
 */
declare global { namespace Express {
    interface Request {
      analyticsContext?: {
        traceId: string;
        timestamp: Date;
        user_id?: string;
        metadata?: Record<string, any>;
       };
    }
  }
}