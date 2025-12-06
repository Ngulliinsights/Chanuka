/**
 * API Utilities - Migrated to Modular Core System
 * 
 * MIGRATION NOTICE: This file has been migrated to use the modular API system.
 * All functionality is now available through @client/core/api
 * 
 * This file maintains backward compatibility during the migration period.
 * 
 * @deprecated Use @client/core/api instead
 */

// Import everything from the new modular system
export * from '../core/api';

// Legacy imports for backward compatibility
import {
  BaseApiClient,
  AuthenticatedApiClient,
  SafeApiClient,
  type ApiRequest,
  type ApiResponse,
  type ApiClientConfig,
  type SafeApiResult,
  type RequestBody
} from '../core/api';

/**
 * Legacy API client class (maps to BaseApiClient)
 * @deprecated Use BaseApiClient from @client/core/api instead
 */
export class ApiClient extends BaseApiClient {
  constructor(config: Partial<ApiClientConfig> = {}) {
    super(config);
  }
}

/**
 * Legacy authenticated API client class
 * @deprecated Use AuthenticatedApiClient from @client/core/api instead
 */
export class AuthenticatedApiClient extends AuthenticatedApiClient {
  constructor(config: any = {}) {
    super(config);
  }
}

/**
 * Legacy safe API client class
 * @deprecated Use SafeApiClient from @client/core/api instead
 */
export class SafeApiClient extends SafeApiClient {
  constructor(client: BaseApiClient) {
    super(client);
  }
}

// Create singleton instances for backward compatibility
const baseURL = process.env.REACT_APP_API_BASE_URL || '/api';

/**
 * Pre-configured client instances (legacy)
 * @deprecated Use clients from @client/core/api instead
 */
export const apiClient = new BaseApiClient({
  baseURL,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

export const authenticatedApi = new AuthenticatedApiClient({
  baseURL,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

export const safeApi = new SafeApiClient(authenticatedApi);

// Legacy convenience functions
export async function get<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.get<T>(url, headers);
}

export async function post<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.post<T>(url, body, headers);
}

export async function put<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.put<T>(url, body, headers);
}

export async function del<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.delete<T>(url, headers);
}

export async function patch<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.patch<T>(url, body, headers);
}

// Authenticated HTTP methods
export async function secureGet<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.get<T>(url, headers);
}

export async function securePost<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.post<T>(url, body, headers);
}

export async function securePut<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.put<T>(url, body, headers);
}

export async function secureDelete<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.delete<T>(url, headers);
}

// Safe wrapper for error handling
export async function safeFetch<T = unknown>(
  url: string, 
  options?: Partial<ApiRequest>
): Promise<SafeApiResult<T>> {
  return safeApi.safeRequest<T>({ url, method: 'GET', ...options });
}

// Legacy export object
export const apiUtils = {
  // Clients
  ApiClient: BaseApiClient,
  AuthenticatedApiClient,
  SafeApiClient,
  
  // Instances
  apiClient,
  authenticatedApi,
  safeApi,
  
  // Methods
  get,
  post,
  put,
  del,
  patch,
  secureGet,
  securePost,
  securePut,
  secureDelete,
  safeFetch
};

export default apiUtils;