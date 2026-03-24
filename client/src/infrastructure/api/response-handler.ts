/**
 * API Response Handler
 * Utilities for handling standardized API responses from server
 * Handles both the new { success, data } format and legacy formats
 */

import type { ApiResponse } from '@shared/types/api/contracts/core.contracts';

/**
 * Client-side alias for the shared API response type.
 * @see ApiResponse from @shared/types/api/contracts/core.contracts
 */
export type StandardApiResponse<T = unknown> = ApiResponse<T>;

/**
 * Extract data from standardized response
 * Handles both new and legacy response formats
 */
export async function extractResponseData<T>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const json = await response.json() as StandardApiResponse<T> | T;

  // Handle standardized format from response middleware
  if (json && typeof json === 'object' && 'success' in json) {
    const standardized = json as StandardApiResponse<T>;
    
    if (!standardized.success) {
      const error = standardized.error || { message: 'API request failed' };
      throw new Error(error.message);
    }

    return standardized.data as T;
  }

  // Legacy: return data directly
  return json as T;
}

/**
 * Fetch helper that includes response standardization handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  return extractResponseData<T>(response);
}

/**
 * Fetch with method helpers
 */
export const apiFetchClient = {
  async get<T>(url: string): Promise<T> {
    return apiFetch<T>(url, { method: 'GET' });
  },

  async post<T>(url: string, data: unknown): Promise<T> {
    return apiFetch<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async put<T>(url: string, data: unknown): Promise<T> {
    return apiFetch<T>(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async delete<T>(url: string): Promise<T> {
    return apiFetch<T>(url, { method: 'DELETE' });
  },
};
