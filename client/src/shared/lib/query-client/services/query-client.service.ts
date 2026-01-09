/**
 * Query Client Service
 *
 * Service layer for query client operations with dependency injection support
 */

import { QueryClient, QueryFunction, QueryKey } from '@tanstack/react-query';
// Simple logger for now - will be replaced with proper logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  error: (message: string, data?: any) => console.error(message, data),
  debug: (message: string, data?: any) => console.debug(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
};
import type {
  ApiRequestConfig,
  ApiResponse,
  QueryFunctionConfig,
  QueryClientConfigFSD,
  QueryKeyFactory,
  QueryCacheUtils,
  OfflineSupportConfig,
  ErrorHandlingConfig,
  DevUtilsConfig,
} from '../types/query-client.types';

/**
 * API Request Service
 * Handles HTTP requests with proper error handling and logging
 */
export class ApiRequestService {
  private readonly defaultConfig: Partial<ApiRequestConfig>;

  constructor(config?: Partial<ApiRequestConfig>) {
    this.defaultConfig = {
      credentials: 'include',
      ...config,
    };
  }

  /**
   * Makes an API request with proper error handling
   */
  async request<T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      const response = await fetch(finalConfig.url, {
        method: finalConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...finalConfig.headers,
        },
        body: finalConfig.data ? JSON.stringify(finalConfig.data) : undefined,
        credentials: finalConfig.credentials,
      });

      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      logger.error('API request failed', {
        url: config.url,
        method: config.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Makes a GET request
   */
  async get<T = unknown>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  /**
   * Makes a POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  /**
   * Makes a PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  /**
   * Makes a DELETE request
   */
  async delete<T = unknown>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }

  /**
   * Makes a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data, ...config });
  }
}

/**
 * Query Function Factory
 * Creates query functions with proper error handling and configuration
 */
export class QueryFunctionFactory {
  private readonly apiService: ApiRequestService;
  private readonly defaultConfig: QueryFunctionConfig;

  constructor(apiService: ApiRequestService, config?: Partial<QueryFunctionConfig>) {
    this.apiService = apiService;
    this.defaultConfig = {
      on401: 'throw',
      retry: 3,
      timeout: 10000,
      cacheTime: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
      ...config,
    };
  }

  /**
   * Creates a query function for a specific endpoint
   */
  createQueryFunction<T = unknown>(
    url: string,
    config?: Partial<QueryFunctionConfig>
  ): QueryFunction<T> {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async ({ queryKey }) => {
      try {
        const response = await this.apiService.get<T>(url);
        return response.data;
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          if (finalConfig.on401 === 'returnNull') {
            return null as unknown as T;
          }
        }
        throw error;
      }
    };
  }

  /**
   * Creates a mutation function for a specific endpoint
   */
  createMutationFunction<TData = unknown, TVariables = unknown>(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
  ) {
    return async (variables: TVariables): Promise<TData> => {
      const response = await this.apiService.request<TData>({
        method,
        url,
        data: variables,
      });
      return response.data;
    };
  }
}

/**
 * Query Key Factory
 * Creates and manages query keys with proper naming conventions
 */
export class QueryKeyFactoryImpl implements QueryKeyFactory {
  /**
   * Creates a query key from arguments
   */
  create(...args: any[]): QueryKey {
    return args;
  }

  /**
   * Parses a query key into its components
   */
  parse(key: QueryKey): any[] {
    return Array.isArray(key) ? key : [key];
  }

  /**
   * Checks if a query key matches a pattern
   */
  match(key: QueryKey, pattern: QueryKey): boolean {
    const keyArray = this.parse(key);
    const patternArray = this.parse(pattern);

    if (keyArray.length !== patternArray.length) {
      return false;
    }

    return patternArray.every((patternPart, index) => {
      const keyPart = keyArray[index];
      if (patternPart === '*') return true;
      if (typeof patternPart === 'function') {
        return patternPart(keyPart);
      }
      return patternPart === keyPart;
    });
  }
}

/**
 * Query Cache Utilities
 * Provides utilities for cache management
 */
export class QueryCacheUtilsImpl implements QueryCacheUtils {
  private readonly queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidates queries matching the key
   */
  async invalidateQueries(queryKey: QueryKey): Promise<void> {
    await this.queryClient.invalidateQueries({ queryKey });
  }

  /**
   * Prefetches queries
   */
  async prefetchQueries(queryKey: QueryKey, queryFn: QueryFunction): Promise<void> {
    await this.queryClient.prefetchQuery({
      queryKey,
      queryFn,
    });
  }

  /**
   * Removes queries matching the key
   */
  removeQueries(queryKey: QueryKey): void {
    this.queryClient.removeQueries({ queryKey });
  }

  /**
   * Clears all cache
   */
  clearCache(): void {
    this.queryClient.clear();
  }

  /**
   * Gets query state
   */
  getQueryState(queryKey: QueryKey): any {
    return this.queryClient.getQueryState(queryKey);
  }
}

/**
 * Query Client Factory
 * Creates configured query clients with FSD patterns
 */
export class QueryClientFactory {
  /**
   * Creates a query client with FSD configuration
   */
  static createClient(config?: QueryClientConfigFSD): QueryClient {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: async ({ queryKey }) => {
            const url = queryKey[0] as string;
            const apiService = new ApiRequestService();
            const response = await apiService.get(url);
            return response.data;
          },
          refetchInterval: false,
          refetchOnWindowFocus: false,
          staleTime: Infinity,
          retry: false,
          ...config?.defaultOptions?.queries,
        },
        mutations: {
          retry: false,
          ...config?.defaultOptions?.mutations,
        },
      },
      ...config,
    });

    // Setup offline support if enabled
    if (config?.offlineSupport?.enabled) {
      this.setupOfflineSupport(queryClient, config.offlineSupport);
    }

    // Setup error handling if configured
    if (config?.errorHandling) {
      this.setupErrorHandling(queryClient, config.errorHandling);
    }

    // Setup development utilities if enabled
    if (config?.defaultOptions?.queries?.gcTime) {
      this.setupCacheManagement(queryClient, config.defaultOptions.queries.gcTime);
    }

    return queryClient;
  }

  /**
   * Sets up offline support
   */
  private static setupOfflineSupport(queryClient: QueryClient, config: OfflineSupportConfig): void {
    // Implementation for offline support would go here
    logger.info('Offline support enabled', { maxAge: config.maxAge, maxSize: config.maxSize });
  }

  /**
   * Sets up error handling
   */
  private static setupErrorHandling(queryClient: QueryClient, config: ErrorHandlingConfig): void {
    if (config.globalErrorHandler) {
      queryClient.setMutationDefaults([], {
        onError: config.globalErrorHandler,
      });
    }
  }

  /**
   * Sets up cache management
   */
  private static setupCacheManagement(queryClient: QueryClient, gcTime: number): void {
    // Implementation for cache management would go here
    logger.info('Cache management configured', { gcTime });
  }
}

/**
 * Development Utilities
 * Provides development-time utilities for query debugging
 */
export class DevUtils {
  private readonly queryClient: QueryClient;
  private readonly config: DevUtilsConfig;

  constructor(queryClient: QueryClient, config: DevUtilsConfig) {
    this.queryClient = queryClient;
    this.config = config;
  }

  /**
   * Logs query information
   */
  logQuery(queryKey: QueryKey): void {
    if (!this.config.enabled || this.config.logLevel !== 'debug') return;

    const state = this.queryClient.getQueryState(queryKey);
    logger.debug('Query state', {
      queryKey,
      state,
    });
  }

  /**
   * Logs mutation information
   */
  logMutation(mutationKey: QueryKey, variables: any): void {
    if (!this.config.enabled || this.config.logLevel !== 'debug') return;

    logger.debug('Mutation called', {
      mutationKey,
      variables,
    });
  }

  /**
   * Clears all queries for debugging
   */
  clearAllQueries(): void {
    if (!this.config.enabled) return;

    this.queryClient.clear();
    logger.info('All queries cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { queryCount: number; mutationCount: number; cacheSize: number } {
    if (!this.config.enabled) return { queryCount: 0, mutationCount: 0, cacheSize: 0 };

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    const mutations = this.queryClient.getMutationCache().getAll();

    return {
      queryCount: queries.length,
      mutationCount: mutations.length,
      cacheSize: queries.reduce((acc, query) => acc + (query.getObserversCount() || 0), 0),
    };
  }
}

// Global instances
export const apiRequestService = new ApiRequestService();
export const queryKeyFactory = new QueryKeyFactoryImpl();
