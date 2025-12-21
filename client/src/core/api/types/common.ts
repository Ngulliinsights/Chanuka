/**
 * Common Types
 * 
 * Shared types and utilities used across multiple modules
 */

import { ZodSchema } from 'zod';
import type { RequestInterceptor, ResponseInterceptor } from './config';

// ============================================================================
// Common Enums and Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SortOrder = 'asc' | 'desc';

export type ErrorCode = 
  | string 
  | 'NETWORK_ERROR' 
  | 'TIMEOUT' 
  | 'VALIDATION_ERROR' 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'CONFLICT' 
  | 'SERVER_ERROR' 
  | 'RATE_LIMITED' 
  | 'UNKNOWN';

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
}

export interface PaginationInfo {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  readonly data: ReadonlyArray<T>;
  readonly pagination: PaginationInfo;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// API Client Types
// ============================================================================

export interface ApiClient {
  get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

export interface ApiRequest<T = unknown> {
  readonly id: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: T;
  readonly timeout: number;
  readonly timestamp: string;
  readonly metadata?: RequestMetadata;
}

interface RequestMetadata {
  readonly correlationId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly retryCount?: number;
}

export interface ApiResponse<T = unknown> {
  readonly id: string;
  readonly requestId: string;
  readonly data: T;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timestamp: string;
  readonly duration: number;
  readonly cached: boolean;
  readonly fromFallback: boolean;
}

export interface RequestOptions {
  readonly timeout?: number;
  readonly retry?: RetryConfig;
  readonly cache?: CacheOptions;
  readonly validate?: ValidationOptions;
  readonly headers?: Readonly<Record<string, string>>;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
  readonly fallbackData?: unknown;
  readonly skipCache?: boolean;
  readonly cacheTTL?: number;
  readonly responseSchema?: ZodSchema;
  readonly signal?: AbortSignal;
  readonly priority?: RequestPriority;
  readonly retries?: number; // Legacy support
}

/**
 * Retry configuration with exponential backoff support.
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly retryableStatusCodes?: ReadonlyArray<number>;
  readonly retryableErrors?: ReadonlyArray<string>;
}

/**
 * Cache configuration for request/response caching.
 */
export interface CacheOptions {
  readonly ttl?: number;
  readonly persist?: boolean;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly key?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly invalidateOn?: ReadonlyArray<CacheInvalidationTrigger>;
}

export type CacheInvalidationTrigger = 'mutation' | 'time' | 'manual' | 'dependency';

/**
 * Validation options for request/response data.
 */
export interface ValidationOptions {
  readonly schema?: ZodSchema;
  readonly strict?: boolean;
  readonly stripUnknown?: boolean;
  readonly coerceTypes?: boolean;
}

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface UnifiedApiClient extends ApiClient {
  request<T>(request: ApiRequest): Promise<ApiResponse<T>>;
  setBaseUrl(url: string): void;
  setTimeout(timeout: number): void;
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
}

// ============================================================================
// Rating and Review Types
// ============================================================================

export type VoteType = 'up' | 'down';

// ============================================================================
// Error Types (re-export from core/error)
// ============================================================================

export {
  ErrorDomain,
  ErrorSeverity,
  type AppError as UnifiedError,
  type ErrorContext
} from '../../error';
