/**
 * API Endpoint Contract System
 * Type-safe endpoint definitions with request/response validation
 */

import { z } from 'zod';
import { HttpMethod } from '../request-types';

/**
 * API Endpoint Definition
 * Defines a type-safe contract for an API endpoint
 */
export interface ApiEndpoint<TRequest = unknown, TResponse = unknown> {
  /**
   * HTTP method for the endpoint
   */
  readonly method: HttpMethod;

  /**
   * URL path for the endpoint (can include path parameters like :id)
   */
  readonly path: string;

  /**
   * Zod schema for validating request data
   */
  readonly requestSchema: z.ZodSchema<TRequest>;

  /**
   * Zod schema for validating response data
   */
  readonly responseSchema: z.ZodSchema<TResponse>;

  /**
   * Optional description of the endpoint
   */
  readonly description?: string;

  /**
   * Optional tags for categorizing endpoints
   */
  readonly tags?: readonly string[];

  /**
   * Whether authentication is required
   */
  readonly requiresAuth?: boolean;

  /**
   * Required permissions for the endpoint
   */
  readonly requiredPermissions?: readonly string[];
}

/**
 * Endpoint with path parameters
 */
export interface ApiEndpointWithParams<
  TRequest = unknown,
  TResponse = unknown,
  TParams = Record<string, string>
> extends ApiEndpoint<TRequest, TResponse> {
  /**
   * Zod schema for validating path parameters
   */
  readonly paramsSchema: z.ZodSchema<TParams>;
}

/**
 * Endpoint with query parameters
 */
export interface ApiEndpointWithQuery<
  TRequest = unknown,
  TResponse = unknown,
  TQuery = Record<string, unknown>
> extends ApiEndpoint<TRequest, TResponse> {
  /**
   * Zod schema for validating query parameters
   */
  readonly querySchema: z.ZodSchema<TQuery>;
}

/**
 * Endpoint with both path and query parameters
 */
export interface ApiEndpointWithParamsAndQuery<
  TRequest = unknown,
  TResponse = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, unknown>
> extends ApiEndpoint<TRequest, TResponse> {
  /**
   * Zod schema for validating path parameters
   */
  readonly paramsSchema: z.ZodSchema<TParams>;

  /**
   * Zod schema for validating query parameters
   */
  readonly querySchema: z.ZodSchema<TQuery>;
}

/**
 * Type-safe endpoint caller result
 */
export interface EndpointCallResult<TResponse> {
  /**
   * Whether the call was successful
   */
  readonly success: boolean;

  /**
   * Response data if successful
   */
  readonly data?: TResponse;

  /**
   * Error if unsuccessful
   */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };

  /**
   * HTTP status code
   */
  readonly status: number;

  /**
   * Response headers
   */
  readonly headers?: Record<string, string>;
}

/**
 * Endpoint validation result
 */
export interface EndpointValidationResult<T> {
  /**
   * Whether validation passed
   */
  readonly valid: boolean;

  /**
   * Validated data if successful
   */
  readonly data?: T;

  /**
   * Validation errors if unsuccessful
   */
  readonly errors?: readonly {
    readonly path: string;
    readonly message: string;
  }[];
}

/**
 * Validate request data against endpoint schema
 */
export function validateRequest<TRequest>(
  endpoint: ApiEndpoint<TRequest, unknown>,
  data: unknown
): EndpointValidationResult<TRequest> {
  const result = endpoint.requestSchema.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Validate response data against endpoint schema
 */
export function validateResponse<TResponse>(
  endpoint: ApiEndpoint<unknown, TResponse>,
  data: unknown
): EndpointValidationResult<TResponse> {
  const result = endpoint.responseSchema.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Validate path parameters against endpoint schema
 */
export function validateParams<TParams>(
  endpoint: ApiEndpointWithParams<unknown, unknown, TParams>,
  params: unknown
): EndpointValidationResult<TParams> {
  const result = endpoint.paramsSchema.safeParse(params);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Validate query parameters against endpoint schema
 */
export function validateQuery<TQuery>(
  endpoint: ApiEndpointWithQuery<unknown, unknown, TQuery>,
  query: unknown
): EndpointValidationResult<TQuery> {
  const result = endpoint.querySchema.safeParse(query);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}
