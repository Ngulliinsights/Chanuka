/**
 * Core API Contracts
 * Standardized request/response types for all features
 */

// Base API Response Structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationMeta;
  quotaRemaining?: QuotaInfo;
  timestamp?: string;
}

export interface ApiError {
  type: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  correlationId?: string;
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