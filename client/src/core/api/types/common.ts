/**
 * Common Types
 * 
 * Shared types and utilities used across multiple modules
 */

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
