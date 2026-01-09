/**
 * Query Client Type Definitions
 *
 * Type-safe definitions for query client operations
 */

import { QueryClient, QueryFunction, QueryKey, QueryClientConfig } from '@tanstack/react-query';
import { z } from 'zod';

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Query function configuration
 */
export interface QueryFunctionConfig {
  on401: 'returnNull' | 'throw';
  retry?: number;
  timeout?: number;
  cacheTime?: number;
  staleTime?: number;
}

/**
 * Query client configuration with FSD patterns
 */
export interface QueryClientConfigFSD extends Omit<QueryClientConfig, 'defaultOptions'> {
  defaultOptions?: {
    queries?: {
      queryFn?: QueryFunction;
      refetchInterval?: number | false;
      refetchOnWindowFocus?: boolean;
      staleTime?: number;
      retry?: boolean | ((failureCount: number, error: unknown) => boolean);
      gcTime?: number;
    };
    mutations?: {
      retry?: boolean | ((failureCount: number, error: unknown) => boolean);
      gcTime?: number;
    };
  };
  offlineSupport?: {
    enabled: boolean;
    maxAge?: number;
    maxSize?: number;
  };
  errorHandling?: {
    globalErrorHandler?: (error: Error) => void;
    retryDelay?: (attemptIndex: number) => number;
  };
}

/**
 * Query key factory
 */
export interface QueryKeyFactory {
  create: (...args: any[]) => QueryKey;
  parse: (key: QueryKey) => any[];
  match: (key: QueryKey, pattern: QueryKey) => boolean;
}

/**
 * Query cache utilities
 */
export interface QueryCacheUtils {
  invalidateQueries: (queryKey: QueryKey) => Promise<void>;
  prefetchQueries: (queryKey: QueryKey, queryFn: QueryFunction) => Promise<void>;
  removeQueries: (queryKey: QueryKey) => void;
  clearCache: () => void;
  getQueryState: (queryKey: QueryKey) => any;
}

/**
 * Offline support configuration
 */
export interface OfflineSupportConfig {
  enabled: boolean;
  maxAge?: number; // Cache max age in milliseconds
  maxSize?: number; // Max cache size
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  globalErrorHandler?: (error: Error) => void;
  retryDelay?: (attemptIndex: number) => number;
  errorTransformers?: Array<(error: Error) => Error>;
}

/**
 * Development utilities configuration
 */
export interface DevUtilsConfig {
  enabled: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableDevTools?: boolean;
  logQueries?: boolean;
  logMutations?: boolean;
}

/**
 * API request schema
 */
export const apiRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  url: z.string().url(),
  data: z.any().optional(),
  headers: z.record(z.string()).optional(),
  credentials: z.enum(['include', 'omit', 'same-origin']).optional(),
});

/**
 * API response schema
 */
export const apiResponseSchema = z.object({
  data: z.any(),
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string()),
});

/**
 * Query function config schema
 */
export const queryFunctionConfigSchema = z.object({
  on401: z.enum(['returnNull', 'throw']),
  retry: z.number().optional(),
  timeout: z.number().optional(),
  cacheTime: z.number().optional(),
  staleTime: z.number().optional(),
});

/**
 * Query client config schema
 */
export const queryClientConfigSchema = z.object({
  defaultOptions: z.object({
    queries: z.object({
      queryFn: z.function().optional(),
      refetchInterval: z.union([z.number(), z.literal(false)]).optional(),
      refetchOnWindowFocus: z.boolean().optional(),
      staleTime: z.number().optional(),
      retry: z.union([z.boolean(), z.function()]).optional(),
      gcTime: z.number().optional(),
    }).optional(),
    mutations: z.object({
      retry: z.union([z.boolean(), z.function()]).optional(),
      gcTime: z.number().optional(),
    }).optional(),
  }).optional(),
  offlineSupport: z.object({
    enabled: z.boolean(),
    maxAge: z.number().optional(),
    maxSize: z.number().optional(),
  }).optional(),
  errorHandling: z.object({
    globalErrorHandler: z.function().optional(),
    retryDelay: z.function().optional(),
  }).optional(),
});

/**
 * Query key factory schema
 */
export const queryKeyFactorySchema = z.object({
  create: z.function(),
  parse: z.function(),
  match: z.function(),
});

/**
 * Query cache utils schema
 */
export const queryCacheUtilsSchema = z.object({
  invalidateQueries: z.function(),
  prefetchQueries: z.function(),
  removeQueries: z.function(),
  clearCache: z.function(),
  getQueryState: z.function(),
});

/**
 * Type inference for API request
 */
export type ApiRequest = z.infer<typeof apiRequestSchema>;

/**
 * Type inference for API response
 */
export type ApiResponseData = z.infer<typeof apiResponseSchema>;

/**
 * Type inference for query function config
 */
export type QueryFunctionConfigData = z.infer<typeof queryFunctionConfigSchema>;

/**
 * Type inference for query client config
 */
export type QueryClientConfigData = z.infer<typeof queryClientConfigSchema>;

/**
 * Type inference for query key factory
 */
export type QueryKeyFactoryData = z.infer<typeof queryKeyFactorySchema>;

/**
 * Type inference for query cache utils
 */
export type QueryCacheUtilsData = z.infer<typeof queryCacheUtilsSchema>;
