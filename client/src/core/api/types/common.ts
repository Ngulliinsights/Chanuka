/**
 * Common Types
 * Shared types and utilities used across multiple modules.
 */

import type { ZodSchema } from 'zod';
import type { RequestInterceptor, ResponseInterceptor } from './interceptors';

// ============================================================================
// Primitives
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SortOrder = 'asc' | 'desc';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';
export type CacheInvalidationTrigger = 'mutation' | 'time' | 'manual' | 'dependency';
export type VoteType = 'up' | 'down';

// ============================================================================
// Pagination
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
// Request & Response
// ============================================================================

export interface ApiRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly data?: unknown;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string | number | boolean>;
}

export interface ApiResponse<T = unknown> {
  readonly data: T;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly timestamp: number;
}

export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly retryableStatusCodes?: ReadonlyArray<number>;
  readonly retryableErrors?: ReadonlyArray<string>;
}

export interface CacheOptions {
  readonly ttl?: number;
  readonly key?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly persist?: boolean;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly invalidateOn?: ReadonlyArray<CacheInvalidationTrigger>;
}

export interface ValidationOptions {
  readonly schema?: ZodSchema;
  readonly strict?: boolean;
  readonly stripUnknown?: boolean;
  readonly coerceTypes?: boolean;
}

export interface RequestOptions {
  readonly method?: HttpMethod;
  readonly headers?: Readonly<Record<string, string>>;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
  readonly priority?: RequestPriority;
  readonly retry?: RetryConfig;
  readonly cache?: CacheOptions;
  readonly validate?: ValidationOptions;
  readonly responseSchema?: ZodSchema;
  readonly fallbackData?: unknown;
  /** @deprecated Use `cache` with `ttl` instead */
  readonly cacheTTL?: number;
  /** @deprecated Use `retry.maxRetries` instead */
  readonly retries?: number;
}

// ============================================================================
// Client Interfaces
// ============================================================================

export interface ApiClient {
  get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

export interface UnifiedApiClient extends ApiClient {
  request<T>(request: ApiRequest, options?: RequestOptions): Promise<ApiResponse<T>>;
  setBaseUrl(url: string): void;
  setTimeout(timeout: number): void;
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
}

// ============================================================================
// Domain Models
// ============================================================================

export interface BaseBillData {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// Legacy (kept for backward compatibility — schedule removal)
// ============================================================================

/** @deprecated Use `ApiRequest` instead */
export interface BaseApiRequest {
  method: HttpMethod;
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
}

/** @deprecated Use `ApiResponse` instead */
export interface BaseApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/** @deprecated Inline this config at the call site */
export interface BaseApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

/** @deprecated Use typed event messages instead */
export interface BaseWebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  ErrorDomain,
  ErrorSeverity,
  type AppError as UnifiedError,
  type ErrorContext,
} from '../../error';