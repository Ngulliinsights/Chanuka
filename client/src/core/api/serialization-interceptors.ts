/**
 * API Serialization Interceptors
 * 
 * Provides request and response interceptors for automatic serialization
 * and deserialization of domain models with proper Date handling.
 * 
 * Feature: comprehensive-bug-fixes
 * Requirements: 14.3, 14.4
 */

// Temporary inline serialization until shared utils are available
function serializeDomainModel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeDomainModel(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        item && typeof item === 'object' && !(item instanceof Date)
          ? serializeDomainModel(item as Record<string, unknown>)
          : item instanceof Date
          ? item.toISOString()
          : item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

import type { BaseClientRequest, BaseClientResponse, RequestInterceptor, ResponseInterceptor } from './base-client';

/**
 * Request interceptor that serializes request bodies
 * Converts Date objects to ISO 8601 strings
 */
export const serializationRequestInterceptor: RequestInterceptor = async (
  request: BaseClientRequest
): Promise<BaseClientRequest> => {
  // Only serialize JSON bodies (not FormData or strings)
  if (
    request.body &&
    typeof request.body === 'object' &&
    !(request.body instanceof FormData) &&
    request.method !== 'GET'
  ) {
    try {
      const serialized = serializeDomainModel(request.body as Record<string, unknown>);
      return {
        ...request,
        body: serialized,
      };
    } catch (error) {
      // If serialization fails, log and pass through original body
      console.error('Failed to serialize request body:', error);
      return request;
    }
  }

  return request;
};

/**
 * Response interceptor that deserializes response data
 * Converts ISO 8601 strings to Date objects
 * 
 * Note: This uses automatic date detection without requiring Zod schemas
 */
export const deserializationResponseInterceptor: ResponseInterceptor = async <T>(
  response: BaseClientResponse<T>
): Promise<BaseClientResponse<T>> => {
  // Only deserialize JSON responses
  if (response.data && typeof response.data === 'object') {
    try {
      const deserialized = convertISOStringsToDates(response.data);
      return {
        ...response,
        data: deserialized as T,
      };
    } catch (error) {
      // If deserialization fails, log and pass through original data
      console.error('Failed to deserialize response data:', error);
      return response;
    }
  }

  return response;
};

/**
 * Recursively converts ISO 8601 strings to Date objects
 * 
 * @param obj - Object to process
 * @returns Object with Date objects instead of ISO strings
 */
function convertISOStringsToDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string' && isISODateString(obj)) {
    return new Date(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertISOStringsToDates(item)) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertISOStringsToDates(value);
    }
    return converted as T;
  }

  return obj;
}

/**
 * Checks if a string is a valid ISO 8601 date string
 * 
 * @param str - String to check
 * @returns True if string is a valid ISO date
 */
function isISODateString(str: string): boolean {
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or with timezone offset
  // Also handles negative years (BCE dates) and extended years (beyond 9999)
  const isoDateRegex =
    /^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;

  if (!isoDateRegex.test(str)) {
    return false;
  }

  // Verify it's a valid date
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Additional validation: ensure the date string round-trips correctly
  // This catches cases like "2024-02-30" which JavaScript converts to "2024-03-02"
  const roundTripped = date.toISOString();
  
  // Extract the date parts (ignoring timezone differences)
  const originalDatePart = str.substring(0, 10); // YYYY-MM-DD
  const roundTrippedDatePart = roundTripped.substring(0, 10);
  
  return originalDatePart === roundTrippedDatePart;
}

/**
 * Helper to install serialization interceptors on an API client
 * 
 * @param client - API client instance
 */
export function installSerializationInterceptors(client: {
  addRequestInterceptor: (interceptor: RequestInterceptor) => void;
  addResponseInterceptor: (interceptor: ResponseInterceptor) => void;
}): void {
  client.addRequestInterceptor(serializationRequestInterceptor);
  client.addResponseInterceptor(deserializationResponseInterceptor);
}
