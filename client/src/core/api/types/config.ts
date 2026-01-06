/**
 * Configuration Types
 *
 * Type definitions for service configuration and settings
 */

import type { CacheConfig } from './cache';

export interface BaseWebSocketMessage<T = unknown> {
  type: string;
  data: T;
}

export interface BaseBillData {
  id: string;
  title: string;
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  message: {
    compression: boolean;
    batching: boolean;
    batchSize: number;
    batchInterval: number;
    maxMessageSize: number;
  };
  authentication: {
    type: 'token' | 'session';
    tokenProvider?: () => string | Promise<string>;
  };
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes?: ReadonlyArray<number>;
  retryableErrors?: ReadonlyArray<string>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceConfig {
  readonly api: ApiConfig;
  readonly websocket: WebSocketConfig;
  readonly features: FeatureFlags;
  readonly limits: ServiceLimits;
  readonly monitoring: MonitoringConfig;
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retry: RetryConfig;
  readonly cache: CacheConfig;
  readonly rateLimit?: RateLimitConfig;
}

export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly strategy: 'fixed' | 'sliding';
}

export interface FeatureFlags {
  readonly offlineMode: boolean;
  readonly realTimeUpdates: boolean;
  readonly analytics: boolean;
  readonly errorReporting: boolean;
  readonly performanceMonitoring: boolean;
  readonly experimentalFeatures: boolean;
}

export interface ServiceLimits {
  readonly maxConcurrentRequests: number;
  readonly maxCacheSize: number;
  readonly maxWebSocketSubscriptions: number;
  readonly maxRetryAttempts: number;
}

export interface MonitoringConfig {
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly logLevel: LogLevel;
  readonly sampleRate: number;
}

// ============================================================================
// Configuration Management
// ============================================================================

export interface ConfigValidator {
  validate(config: ServiceConfig): ReadonlyArray<string>;
}

export interface ConfigObserver {
  onConfigChange(key: string, newValue: unknown, oldValue: unknown): void;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface ClientConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retry: RetryConfig;
  readonly cache: CacheConfig;
  readonly websocket: WebSocketConfig;
  readonly headers: Readonly<Record<string, string>>;
  readonly interceptors?: ClientInterceptors;
}

export interface ClientInterceptors {
  readonly request?: ReadonlyArray<RequestInterceptor>;
  readonly response?: ReadonlyArray<ResponseInterceptor>;
}

export type RequestInterceptor = (
  config: RequestInit & { url: string }
) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;

export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
