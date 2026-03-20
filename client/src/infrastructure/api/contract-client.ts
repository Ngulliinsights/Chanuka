/**
 * Contract-Based API Client
 * Type-safe API client that uses endpoint contracts for validation
 */

import {
  ApiEndpoint,
  ApiEndpointWithParams,
  ApiEndpointWithQuery,
  ApiEndpointWithParamsAndQuery,
  validateRequest,
  validateResponse,
  EndpointCallResult,
} from '@shared/types/api/contracts';
import { logger } from '@client/lib/utils/logger';
import { globalApiClient } from './client';

/**
 * Call an API endpoint with type-safe contract validation
 */
export async function callEndpoint<TRequest, TResponse>(
  endpoint: ApiEndpoint<TRequest, TResponse>,
  request: TRequest
): Promise<EndpointCallResult<TResponse>> {
  try {
    // Validate request data (client-side validation)
    const requestValidation = validateRequest(endpoint, request);

    if (!requestValidation.valid) {
      logger.warn('Client-side request validation failed', {
        endpoint: endpoint.path,
        method: endpoint.method,
        errors: requestValidation.errors,
      });

      return {
        success: false,
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: requestValidation.errors,
        },
      };
    }

    // Make API call based on method
    let response;
    const validatedRequest = requestValidation.data!;

    switch (endpoint.method) {
      case 'GET':
        response = await globalApiClient.get<TResponse>(endpoint.path);
        break;
      case 'POST':
        response = await globalApiClient.post<TResponse>(endpoint.path, validatedRequest);
        break;
      case 'PUT':
        response = await globalApiClient.put<TResponse>(endpoint.path, validatedRequest);
        break;
      case 'PATCH':
        response = await globalApiClient.patch<TResponse>(endpoint.path, validatedRequest);
        break;
      case 'DELETE':
        response = await globalApiClient.delete<TResponse>(endpoint.path);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
    }

    // Validate response data (client-side validation)
    const responseValidation = validateResponse(endpoint, response.data);

    if (!responseValidation.valid) {
      logger.error('Client-side response validation failed', {
        endpoint: endpoint.path,
        method: endpoint.method,
        errors: responseValidation.errors,
      });

      return {
        success: false,
        status: 500,
        error: {
          code: 'RESPONSE_VALIDATION_ERROR',
          message: 'Response validation failed',
          details: responseValidation.errors,
        },
      };
    }

    return {
      success: true,
      status: response.status || 200,
      data: responseValidation.data,
      headers: response.headers,
    };
  } catch (error: unknown) {
    logger.error('API call failed', {
      endpoint: endpoint.path,
      method: endpoint.method,
      error,
    });

    return {
      success: false,
      status: error.status || error.statusCode || 500,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      },
    };
  }
}

/**
 * Call an API endpoint with path parameters
 */
export async function callEndpointWithParams<TRequest, TResponse, TParams>(
  endpoint: ApiEndpointWithParams<TRequest, TResponse, TParams>,
  params: TParams,
  request?: TRequest
): Promise<EndpointCallResult<TResponse>> {
  try {
    // Build URL with path parameters
    let url = endpoint.path;
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }

    // Create a temporary endpoint with the resolved URL
    const resolvedEndpoint: ApiEndpoint<TRequest, TResponse> = {
      ...endpoint,
      path: url,
    };

    // If there's a request body, validate and call
    if (request !== undefined) {
      return callEndpoint(resolvedEndpoint, request);
    }

    // For GET/DELETE, call without request body
    return callEndpoint(resolvedEndpoint, {} as TRequest);
  } catch (error: unknown) {
    logger.error('API call with params failed', {
      endpoint: endpoint.path,
      method: endpoint.method,
      params,
      error,
    });

    return {
      success: false,
      status: error.status || error.statusCode || 500,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      },
    };
  }
}

/**
 * Call an API endpoint with query parameters
 */
export async function callEndpointWithQuery<TRequest, TResponse, TQuery>(
  endpoint: ApiEndpointWithQuery<TRequest, TResponse, TQuery>,
  query: TQuery
): Promise<EndpointCallResult<TResponse>> {
  try {
    // Build URL with query parameters
    const queryString = new URLSearchParams(
      Object.entries(query as Record<string, unknown>)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString();

    const url = queryString ? `${endpoint.path}?${queryString}` : endpoint.path;

    // Create a temporary endpoint with the resolved URL
    const resolvedEndpoint: ApiEndpoint<TRequest, TResponse> = {
      ...endpoint,
      path: url,
    };

    // Call without request body (GET requests)
    return callEndpoint(resolvedEndpoint, {} as TRequest);
  } catch (error: unknown) {
    logger.error('API call with query failed', {
      endpoint: endpoint.path,
      method: endpoint.method,
      query,
      error,
    });

    return {
      success: false,
      status: error.status || error.statusCode || 500,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      },
    };
  }
}

/**
 * Call an API endpoint with both path and query parameters
 */
export async function callEndpointWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>(
  endpoint: ApiEndpointWithParamsAndQuery<TRequest, TResponse, TParams, TQuery>,
  params: TParams,
  query: TQuery,
  request?: TRequest
): Promise<EndpointCallResult<TResponse>> {
  try {
    // Build URL with path parameters
    let url = endpoint.path;
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }

    // Add query parameters
    const queryString = new URLSearchParams(
      Object.entries(query as Record<string, unknown>)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString();

    if (queryString) {
      url = `${url}?${queryString}`;
    }

    // Create a temporary endpoint with the resolved URL
    const resolvedEndpoint: ApiEndpoint<TRequest, TResponse> = {
      ...endpoint,
      path: url,
    };

    // If there's a request body, validate and call
    if (request !== undefined) {
      return callEndpoint(resolvedEndpoint, request);
    }

    // For GET/DELETE, call without request body
    return callEndpoint(resolvedEndpoint, {} as TRequest);
  } catch (error: unknown) {
    logger.error('API call with params and query failed', {
      endpoint: endpoint.path,
      method: endpoint.method,
      params,
      query,
      error,
    });

    return {
      success: false,
      status: error.status || error.statusCode || 500,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      },
    };
  }
}

/**
 * Contract-based API client
 * Provides type-safe methods for calling API endpoints
 */
export const contractApiClient = {
  /**
   * Call an endpoint with just a request body
   */
  call: callEndpoint,

  /**
   * Call an endpoint with path parameters
   */
  callWithParams: callEndpointWithParams,

  /**
   * Call an endpoint with query parameters
   */
  callWithQuery: callEndpointWithQuery,

  /**
   * Call an endpoint with both path and query parameters
   */
  callWithParamsAndQuery: callEndpointWithParamsAndQuery,
};
