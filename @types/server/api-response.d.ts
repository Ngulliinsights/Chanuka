/**
 * Unified API Response Types - Phase 3
 * Aligned with BaseError and ValidationError from Phase 2B
 */

import { BaseError, ValidationError, ErrorDomain, ErrorSeverity } from '@shared/core';

// ============================================================================
// API Response Envelope
// ============================================================================

/**
 * Standard API response envelope for all endpoints
 * - Success: { success: true, data: T, metadata: ResponseMetadata }
 * - Error: Handled by middleware, returns { success: false, error: ErrorDetail }
 */
export interface ApiResponseEnvelope<T = unknown> {
  success: true;
  data: T;
  metadata?: ResponseMetadata;
}

/**
 * Error response structure (from middleware)
 * All errors are caught by error middleware and formatted consistently
 */
export interface ApiErrorResponse {
  success: false;
  error: ErrorDetail;
  metadata: ResponseMetadata;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiResponseEnvelope<T> | ApiErrorResponse;

// ============================================================================
// Error Detail Structure
// ============================================================================

/**
 * Detailed error information from BaseError/ValidationError
 */
export interface ErrorDetail {
  code: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  statusCode: number;
  details?: {
    errors?: ValidationErrorDetail[];
    [key: string]: unknown;
  };
  correlationId?: string;
  timestamp?: string;
}

/**
 * Validation error detail (from ValidationError)
 */
export interface ValidationErrorDetail {
  field?: string;
  code: string;
  message: string;
  value?: unknown;
}

// ============================================================================
// Response Metadata
// ============================================================================

/**
 * Metadata attached to every response
 * Includes timing, correlation, and pagination info
 */
export interface ResponseMetadata {
  timestamp: string;
  correlationId?: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationInfo;
  performance?: PerformanceMetrics;
  tracing?: TracingMetadata;
}

/**
 * Pagination information for list responses
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Performance metrics for request tracking
 */
export interface PerformanceMetrics {
  durationMs: number;
  startTime: string;
  endTime: string;
  cached?: boolean;
  cacheHit?: boolean;
  dbQueryMs?: number;
  externalApiMs?: number;
}

/**
 * Distributed tracing metadata
 */
export interface TracingMetadata {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  route: string;
  userId?: string | number;
  sessionId?: string;
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Context created for every request
 * Used for distributed tracing, logging, and error handling
 */
export interface RequestContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  startTime: number;
  userId?: string | number;
  sessionId?: string;
  route: string;
  method: string;
  path: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Extended Express Request with context
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string | number;
    role: string;
    email?: string;
  };
  context?: RequestContext;
  startTime?: number;
}

// ============================================================================
// Handler Response Types
// ============================================================================

/**
 * Standard handler response before wrapping in envelope
 */
export interface HandlerResponse<T = unknown> {
  data?: T;
  metadata?: Partial<ResponseMetadata>;
  statusCode?: number;
}

/**
 * Paginated response data
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  successful: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: ErrorDetail;
  }>;
}

// ============================================================================
// Error Handler Types
// ============================================================================

/**
 * Error handler function signature
 */
export type ErrorHandler = (
  error: BaseError | ValidationError | Error,
  req: AuthenticatedRequest
) => ErrorDetail;

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: BaseError | ValidationError) => boolean;
  action: () => Promise<void>;
}

// ============================================================================
// AsyncHandler Types
// ============================================================================

/**
 * AsyncHandler wrapper type
 * Wraps async route handlers and catches errors
 */
export type AsyncHandlerFn = (
  req: AuthenticatedRequest,
  res: Express.Response
) => Promise<void>;

export type AsyncHandler = (fn: AsyncHandlerFn) => (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => void;
