/**
 * Core API Contracts
 * Standardized request/response types for all features
 */

/**
 * Metadata for API responses
 */
export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMeta;
  performance?: {
    duration: number;
    cached?: boolean;
    cacheHit?: boolean;
  };
}

// Base API Response Structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  stack?: string; // Development only
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  page?: number;
  totalPages?: number;
}

export interface QuotaInfo {
  minute: number;
  hour: number;
  day: number;
  month: number;
}

// Standard Query Parameters
export interface BaseQueryParams {
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    externalApis?: HealthStatus;
  };
}

export interface HealthStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

// Metadata Response
export interface MetadataResponse<T = any> {
  schema: T;
  enums: Record<string, string[]>;
  constraints: Record<string, any>;
  relationships: Record<string, string[]>;
}

// Sync Operation Response
export interface SyncResponse {
  operation: string;
  status: 'started' | 'completed' | 'failed';
  recordsProcessed?: number;
  errors?: string[];
  duration?: number;
  nextSync?: string;
}