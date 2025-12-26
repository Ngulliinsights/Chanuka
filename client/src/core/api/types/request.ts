/**
 * Request/Response Types
 * 
 * Core API request and response type definitions
 */

import { ZodSchema } from 'zod';

// Base types that were imported from './base'
export interface BaseApiConfig {
  baseURL: string;
  timeout: number;
}

export interface BaseApiRequest {
  method: string;
  url: string;
  data?: any;
}

export interface BaseApiResponse<T = any> {
  data: T;
  status: number;
}

export interface BaseWebSocketMessage<T = any> {
  type: string;
  data: T;
}

export interface BaseBillData {
  id: string;
  title: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';


// ============================================================================
// Request Types
// ============================================================================

/**
 * Represents an outgoing API request with complete metadata.
 */
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

// ============================================================================
// Response Types
// ============================================================================

/**
 * Represents an API response with complete metadata and timing information.
 */
export interface ApiResponse<T = unknown> {
  readonly id: string;
  readonly requestId: string;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
  readonly timestamp: string;
  readonly duration: number;
  readonly cached: boolean;
  readonly fromFallback: boolean;
  readonly message?: string;
  readonly metadata?: ResponseMetadata;
}

interface ResponseMetadata {
  readonly serverVersion?: string;
  readonly rateLimit?: RateLimitInfo;
  readonly warnings?: string[];
}

interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}

// ============================================================================
// Request Configuration
// ============================================================================

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Configuration options for individual API requests.
 */
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
