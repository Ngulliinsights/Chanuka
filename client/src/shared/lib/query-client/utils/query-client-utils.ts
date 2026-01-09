/**
 * Query Client Utilities
 *
 * Utility functions for query client operations
 */

import { QueryClient, QueryKey } from '@tanstack/react-query';
import type {
  QueryKeyFactory,
  QueryCacheUtils,
  OfflineSupportConfig,
  ErrorHandlingConfig,
  DevUtilsConfig,
} from '../types/query-client.types';

/**
 * Creates a query key factory with proper naming conventions
 */
export function createQueryKeyFactory(): QueryKeyFactory {
  return {
    create: (...args: any[]): QueryKey => args,

    parse: (key: QueryKey): any[] => {
      return Array.isArray(key) ? key : [key];
    },

    match: (key: QueryKey, pattern: QueryKey): boolean => {
      const keyArray = Array.isArray(key) ? key : [key];
      const patternArray = Array.isArray(pattern) ? pattern : [pattern];

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
    },
  };
}

/**
 * Creates query cache utilities
 */
export function createQueryCacheUtils(queryClient: QueryClient): QueryCacheUtils {
  return {
    invalidateQueries: async (queryKey: QueryKey): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey });
    },

    prefetchQueries: async (queryKey: QueryKey, queryFn: any): Promise<void> => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
      });
    },

    removeQueries: (queryKey: QueryKey): void => {
      queryClient.removeQueries({ queryKey });
    },

    clearCache: (): void => {
      queryClient.clear();
    },

    getQueryState: (queryKey: QueryKey): any => {
      return queryClient.getQueryState(queryKey);
    },
  };
}

/**
 * Creates offline support utilities
 */
export function createOfflineSupport(config: OfflineSupportConfig) {
  return {
    isEnabled: () => config.enabled,

    getMaxAge: () => config.maxAge || 5 * 60 * 1000, // 5 minutes default

    getMaxSize: () => config.maxSize || 1000, // 1000 items default

    getRetryAttempts: () => config.retryAttempts || 3,

    getRetryDelay: () => config.retryDelay || 1000, // 1 second default

    isOffline: () => !navigator.onLine,

    onOnline: (callback: () => void) => {
      if (config.enabled) {
        window.addEventListener('online', callback);
      }
    },

    onOffline: (callback: () => void) => {
      if (config.enabled) {
        window.addEventListener('offline', callback);
      }
    },
  };
}

/**
 * Creates error handling utilities
 */
export function createErrorHandling(config: ErrorHandlingConfig) {
  return {
    handleGlobalError: (error: Error) => {
      if (config.globalErrorHandler) {
        config.globalErrorHandler(error);
      } else {
        console.error('Global error:', error);
      }
    },

    getRetryDelay: (attemptIndex: number) => {
      if (config.retryDelay) {
        return config.retryDelay(attemptIndex);
      }
      return Math.min(1000 * 2 ** attemptIndex, 30000); // Exponential backoff
    },

    transformError: (error: Error) => {
      if (config.errorTransformers) {
        return config.errorTransformers.reduce((acc, transformer) => transformer(acc), error);
      }
      return error;
    },
  };
}

/**
 * Creates development utilities
 */
export function createDevUtils(queryClient: QueryClient, config: DevUtilsConfig) {
  return {
    isEnabled: () => config.enabled,

    getLogLevel: () => config.logLevel || 'info',

    logQuery: (queryKey: QueryKey) => {
      if (!config.enabled || config.logLevel !== 'debug') return;

      const state = queryClient.getQueryState(queryKey);
      console.debug('Query state', {
        queryKey,
        state,
      });
    },

    logMutation: (mutationKey: QueryKey, variables: any) => {
      if (!config.enabled || config.logLevel !== 'debug') return;

      console.debug('Mutation called', {
        mutationKey,
        variables,
      });
    },

    clearAllQueries: () => {
      if (!config.enabled) return;

      queryClient.clear();
      console.info('All queries cleared');
    },

    getCacheStats: () => {
      if (!config.enabled) return { queryCount: 0, mutationCount: 0, cacheSize: 0 };

      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const mutations = queryClient.getMutationCache().getAll();

      return {
        queryCount: queries.length,
        mutationCount: mutations.length,
        cacheSize: queries.reduce((acc, query) => acc + (query.getObserversCount() || 0), 0),
      };
    },

    enableDevTools: () => {
      if (!config.enabled || !config.enableDevTools) return;

      // Development tools would be enabled here
      console.info('Development tools enabled');
    },
  };
}

/**
 * Creates query client configuration with FSD patterns
 */
export function createQueryClientConfig(config?: {
  offlineSupport?: OfflineSupportConfig;
  errorHandling?: ErrorHandlingConfig;
  devUtils?: DevUtilsConfig;
}) {
  return {
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
    ...config,
  };
}

/**
 * Creates a query key for bills
 */
export function createBillQueryKey(billId?: string, filters?: any): QueryKey {
  const key = ['bills'];
  if (billId) key.push(billId);
  if (filters) key.push(filters);
  return key;
}

/**
 * Creates a query key for users
 */
export function createUserQueryKey(userId?: string, filters?: any): QueryKey {
  const key = ['users'];
  if (userId) key.push(userId);
  if (filters) key.push(filters);
  return key;
}

/**
 * Creates a query key for comments
 */
export function createCommentQueryKey(billId: string, commentId?: string): QueryKey {
  const key = ['comments', billId];
  if (commentId) key.push(commentId);
  return key;
}

/**
 * Creates a query key for search
 */
export function createSearchQueryKey(query: string, filters?: any): QueryKey {
  const key = ['search', query];
  if (filters) key.push(filters);
  return key;
}

/**
 * Creates a query key for analytics
 */
export function createAnalyticsQueryKey(timeRange: string, filters?: any): QueryKey {
  const key = ['analytics', timeRange];
  if (filters) key.push(filters);
  return key;
}

/**
 * Validates a query key
 */
export function validateQueryKey(queryKey: QueryKey): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }

  return queryKey.every(part => part !== null && part !== undefined);
}

/**
 * Normalizes a query key
 */
export function normalizeQueryKey(queryKey: QueryKey): QueryKey {
  if (!Array.isArray(queryKey)) {
    return [queryKey];
  }

  return queryKey.filter(part => part !== null && part !== undefined);
}

/**
 * Creates a cache key from query key
 */
export function createCacheKey(queryKey: QueryKey): string {
  return JSON.stringify(normalizeQueryKey(queryKey));
}

/**
 * Checks if a query is stale
 */
export function isQueryStale(queryKey: QueryKey, queryClient: QueryClient): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state) return true;

  const now = Date.now();
  const lastUpdated = state.dataUpdatedAt;
  const staleTime = state.query?.options?.staleTime || 0;

  return now - lastUpdated > staleTime;
}

/**
 * Gets query data from cache
 */
export function getQueryData<T = unknown>(queryKey: QueryKey, queryClient: QueryClient): T | undefined {
  const state = queryClient.getQueryState(queryKey);
  return state?.data as T | undefined;
}

/**
 * Sets query data in cache
 */
export function setQueryData<T = unknown>(
  queryKey: QueryKey,
  data: T,
  queryClient: QueryClient
): void {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Updates query data in cache
 */
export function updateQueryData<T = unknown>(
  queryKey: QueryKey,
  updater: (oldData: T | undefined) => T,
  queryClient: QueryClient
): void {
  queryClient.setQueryData(queryKey, (oldData: T | undefined) => updater(oldData));
}
