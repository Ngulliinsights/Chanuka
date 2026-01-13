/**
 * Server Controller Types
 * Unified API contracts for controller layer
 */

import { BaseEntity } from '@shared/types/core/base';
import { ApiResponse, PaginatedApiResponse } from '@shared/types/api/response-types';

/**
 * Controller Context
 * Standardized context for controller operations
 */
export interface ControllerContext extends BaseEntity {
  readonly requestId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly endpoint: string;
  readonly method: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Controller Result
 * Standardized controller result with API response integration
 */
export interface ControllerResult<T = unknown> {
  readonly context: ControllerContext;
  readonly response: ApiResponse<T>;
  readonly timestamp: Date;
  readonly duration?: number;
}

/**
 * Controller Action Types
 * Standardized controller action contracts
 */
export interface GetAction<TOutput> {
  (context: ControllerContext, params: Record<string, string>, query: Record<string, string>): Promise<ControllerResult<TOutput>>;
}

export interface PostAction<TInput, TOutput> {
  (context: ControllerContext, body: TInput, params: Record<string, string>, query: Record<string, string>): Promise<ControllerResult<TOutput>>;
}

export interface PutAction<TInput, TOutput> {
  (context: ControllerContext, id: string, body: TInput, params: Record<string, string>, query: Record<string, string>): Promise<ControllerResult<TOutput>>;
}

export interface DeleteAction {
  (context: ControllerContext, id: string, params: Record<string, string>, query: Record<string, string>): Promise<ControllerResult<boolean>>;
}

export interface PatchAction<TInput, TOutput> {
  (context: ControllerContext, id: string, body: TInput, params: Record<string, string>, query: Record<string, string>): Promise<ControllerResult<TOutput>>;
}

/**
 * Paginated Controller Action
 * Standardized paginated controller action contract
 */
export interface PaginatedAction<TInput, TOutput> {
  (context: ControllerContext, input: TInput, pagination: PaginationParams): Promise<ControllerResult<PaginatedApiResponse<TOutput>>>;
}

/**
 * Pagination Parameters
 * Standardized pagination parameters
 */
export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly filter?: Record<string, unknown>;
}

/**
 * Controller Error Types
 * Standardized error handling for controller layer
 */
export class ControllerError extends Error {
  constructor(
    public readonly context: ControllerContext,
    message: string,
    public readonly code?: string,
    public readonly httpStatus: number = 500,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'ControllerError';
    Object.setPrototypeOf(this, ControllerError.prototype);
  }
}

export class BadRequestError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'BAD_REQUEST', 400, 'medium', metadata);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnauthorizedError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'UNAUTHORIZED', 401, 'high', metadata);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'FORBIDDEN', 403, 'high', metadata);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'NOT_FOUND', 404, 'medium', metadata);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'CONFLICT', 409, 'medium', metadata);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ValidationError extends ControllerError {
  constructor(context: ControllerContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'VALIDATION_ERROR', 422, 'medium', metadata);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Controller Configuration
 * Standardized controller configuration
 */
export interface ControllerConfig {
  readonly routePrefix?: string;
  readonly middleware?: string[];
  readonly validationEnabled?: boolean;
  readonly rateLimiting?: RateLimitConfig;
  readonly caching?: CacheConfig;
  readonly auditEnabled?: boolean;
}

/**
 * Rate Limit Configuration
 * Standardized rate limiting configuration
 */
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyPrefix?: string;
  readonly message?: string;
}

/**
 * Cache Configuration
 * Standardized caching configuration for controllers
 */
export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttlSeconds: number;
  readonly keyPrefix?: string;
  readonly varyBy?: string[];
}

/**
 * Controller Metrics
 * Standardized controller performance metrics
 */
export interface ControllerMetrics {
  readonly endpoint: string;
  readonly method: string;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly lastUpdated: Date;
}

/**
 * API Contract Interface
 * Standardized API contract definition
 */
export interface ApiContract {
  readonly version: string;
  readonly endpoints: Record<string, EndpointDefinition>;
  readonly models: Record<string, ModelDefinition>;
  readonly errors: Record<string, ErrorDefinition>;
}

/**
 * Endpoint Definition
 * Standardized endpoint specification
 */
export interface EndpointDefinition {
  readonly method: string;
  readonly path: string;
  readonly description: string;
  readonly request?: RequestDefinition;
  readonly response: ResponseDefinition;
  readonly errors?: string[];
  readonly deprecated?: boolean;
}

/**
 * Request Definition
 * Standardized request specification
 */
export interface RequestDefinition {
  readonly body?: ModelReference;
  readonly params?: ModelReference;
  readonly query?: ModelReference;
  readonly headers?: ModelReference;
}

/**
 * Response Definition
 * Standardized response specification
 */
export interface ResponseDefinition {
  readonly model: ModelReference;
  readonly statusCodes: Record<number, string>;
  readonly pagination?: PaginationDefinition;
}

/**
 * Model Definition
 * Standardized data model specification
 */
export interface ModelDefinition {
  readonly type: 'object' | 'array' | 'primitive';
  readonly properties?: Record<string, PropertyDefinition>;
  readonly required?: string[];
  readonly description?: string;
}

/**
 * Property Definition
 * Standardized property specification
 */
export interface PropertyDefinition {
  readonly type: string;
  readonly format?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly example?: unknown;
}

/**
 * Error Definition
 * Standardized error specification
 */
export interface ErrorDefinition {
  readonly code: string;
  readonly message: string;
  readonly httpStatus: number;
  readonly description?: string;
}

/**
 * Model Reference
 * Reference to a defined model
 */
export interface ModelReference {
  readonly model: string;
  readonly description?: string;
}

/**
 * Pagination Definition
 * Standardized pagination specification
 */
export interface PaginationDefinition {
  readonly defaultLimit: number;
  readonly maxLimit: number;
  readonly strategy: 'offset' | 'cursor';
}