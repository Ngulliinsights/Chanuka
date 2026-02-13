/**
 * Client-Side API Error Handler
 *
 * Handles API errors consistently on the client side.
 * Transforms API errors to StandardError format and provides user-friendly error messages.
 */

import type { ErrorClassification, StandardError } from '@shared/types';
import { ERROR_CODES, ERROR_MESSAGES } from '@shared/constants';

/**
 * Check if an error response is a StandardError from the server
 */
export function isStandardErrorResponse(error: unknown): error is { error: StandardError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as any).error === 'object' &&
    'code' in (error as any).error &&
    'classification' in (error as any).error &&
    'correlationId' in (error as any).error
  );
}

/**
 * Transform a fetch error to StandardError format
 */
export async function transformFetchError(response: Response): Promise<StandardError> {
  const correlationId = response.headers.get('X-Correlation-ID') || generateClientCorrelationId();

  try {
    const data = await response.json();

    // Server returned StandardError format
    if (isStandardErrorResponse(data)) {
      return data.error;
    }

    // Server returned error but not in StandardError format
    if (data.error) {
      return {
        code: data.error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: data.error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        classification: data.error.classification || 'server' as ErrorClassification,
        correlationId,
        timestamp: new Date(data.error.timestamp || Date.now()),
        details: data.error.details,
      };
    }
  } catch {
    // Failed to parse JSON response
  }

  // HTTP status-based error
  if (response.status === 401) {
    return {
      code: ERROR_CODES.NOT_AUTHENTICATED,
      message: ERROR_MESSAGES.NOT_AUTHENTICATED,
      classification: 'authorization' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  if (response.status === 403) {
    return {
      code: ERROR_CODES.ACCESS_DENIED,
      message: ERROR_MESSAGES.ACCESS_DENIED,
      classification: 'authorization' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  if (response.status === 404) {
    return {
      code: ERROR_CODES.BILL_NOT_FOUND,
      message: 'Resource not found',
      classification: 'validation' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  if (response.status >= 500) {
    return {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      classification: 'server' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  // Generic error
  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: `Request failed with status ${response.status}`,
    classification: 'server' as ErrorClassification,
    correlationId,
    timestamp: new Date(),
  };
}

/**
 * Transform a network error to StandardError format
 */
export function transformNetworkError(error: unknown): StandardError {
  const correlationId = generateClientCorrelationId();

  // Timeout error
  if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: ERROR_MESSAGES.TIMEOUT,
      classification: 'network' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      classification: 'network' as ErrorClassification,
      correlationId,
      timestamp: new Date(),
    };
  }

  // Generic error
  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    classification: 'server' as ErrorClassification,
    correlationId,
    timestamp: new Date(),
  };
}

/**
 * Handle API errors consistently
 * This is the main entry point for client-side error handling
 */
export async function handleApiError(error: unknown): Promise<StandardError> {
  // Already a StandardError
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'classification' in error &&
    'correlationId' in error
  ) {
    return error as StandardError;
  }

  // Response error
  if (error instanceof Response) {
    return transformFetchError(error);
  }

  // Network or fetch error
  return transformNetworkError(error);
}

/**
 * Generate a client-side correlation ID
 */
function generateClientCorrelationId(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to timestamp + random
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get user-friendly error message from StandardError
 */
export function getUserFriendlyMessage(error: StandardError): string {
  // Use the error message if it's user-friendly
  if (error.message && !error.message.includes('Error:') && !error.message.includes('Exception')) {
    return error.message;
  }

  // Fallback to generic messages based on classification
  switch (error.classification) {
    case 'validation':
      return 'Please check your input and try again.';
    case 'authorization':
      return 'You do not have permission to perform this action.';
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection.';
    case 'server':
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Display error to user (can be integrated with toast/notification system)
 */
export function displayError(error: StandardError, displayFn?: (message: string) => void): void {
  const message = getUserFriendlyMessage(error);

  if (displayFn) {
    displayFn(message);
  } else {
    // Fallback to console.error
    console.error('API Error:', {
      code: error.code,
      message: error.message,
      correlationId: error.correlationId,
      classification: error.classification,
    });
  }
}

/**
 * Enhanced fetch wrapper with automatic error handling
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await transformFetchError(response);
      throw error;
    }

    return await response.json();
  } catch (error) {
    // Transform to StandardError if not already
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'classification' in error
    ) {
      throw error;
    }

    const standardError = await handleApiError(error);
    throw standardError;
  }
}
