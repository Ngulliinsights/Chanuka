/**
 * Server Service Layer Types
 * Standardized service interfaces with proper error handling
 */

import { BaseEntity } from '@shared/types/core/base';

/**
 * Service Result
 * Standardized service result with comprehensive error handling
 */
export interface ServiceResult<TData = unknown> {
  readonly data?: TData;
  readonly success: boolean;
  readonly error?: Error;
  readonly context?: ServiceContext;
  readonly timestamp: Date;
  readonly duration?: number;
  readonly cacheHit?: boolean;
}

/**
 * Service Context
 * Standardized context for service operations
 */
export interface ServiceContext extends BaseEntity {
  readonly requestId: string;
  readonly userId?: string;
  readonly operationType: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Service Configuration
 * Standardized service configuration
 */
export interface ServiceConfig {
  readonly timeout?: number;
  readonly retryPolicy?: RetryPolicy;
  readonly cacheConfig?: CacheConfig;
  readonly validationEnabled?: boolean;
  readonly auditEnabled?: boolean;
}

/**
 * Retry Policy
 * Standardized retry configuration
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'none';
  readonly retryOnErrors?: string[];
}

/**
 * Cache Configuration
 * Standardized caching configuration
 */
export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttlSeconds: number;
  readonly keyPrefix?: string;
  readonly staleWhileRevalidate?: number;
}

/**
 * Service Error Types
 * Comprehensive error handling for service layer
 */
export class ServiceError extends Error {
  constructor(
    public readonly context: ServiceContext,
    message: string,
    public readonly code?: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public readonly isRetryable: boolean = false,
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

export class DatabaseServiceError extends ServiceError {
  constructor(context: ServiceContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'DATABASE_ERROR', 'high', true, metadata);
    this.name = 'DatabaseServiceError';
    Object.setPrototypeOf(this, DatabaseServiceError.prototype);
  }
}

export class ValidationServiceError extends ServiceError {
  constructor(context: ServiceContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'VALIDATION_ERROR', 'medium', false, metadata);
    this.name = 'ValidationServiceError';
    Object.setPrototypeOf(this, ValidationServiceError.prototype);
  }
}

export class ExternalServiceError extends ServiceError {
  constructor(context: ServiceContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'EXTERNAL_SERVICE_ERROR', 'high', true, metadata);
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class BusinessRuleError extends ServiceError {
  constructor(context: ServiceContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'BUSINESS_RULE_VIOLATION', 'medium', false, metadata);
    this.name = 'BusinessRuleError';
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }
}

/**
 * Service Operation Types
 * Standardized service operation contracts
 */
export interface CreateOperation<TInput, TOutput> {
  (input: TInput, context: ServiceContext, config?: ServiceConfig): Promise<ServiceResult<TOutput>>;
}

export interface ReadOperation<TOutput> {
  (id: string, context: ServiceContext, config?: ServiceConfig): Promise<ServiceResult<TOutput>>;
}

export interface UpdateOperation<TInput, TOutput> {
  (id: string, input: TInput, context: ServiceContext, config?: ServiceConfig): Promise<ServiceResult<TOutput>>;
}

export interface DeleteOperation {
  (id: string, context: ServiceContext, config?: ServiceConfig): Promise<ServiceResult<boolean>>;
}

export interface ListOperation<TOutput> {
  (filter: Record<string, unknown>, context: ServiceContext, config?: ServiceConfig): Promise<ServiceResult<TOutput[]>>;
}

/**
 * Transactional Service Interface
 * Standardized transactional service contract
 */
export interface TransactionalService {
  beginTransaction(context: ServiceContext): Promise<ServiceResult<Transaction>>;
  commitTransaction(transaction: Transaction, context: ServiceContext): Promise<ServiceResult<boolean>>;
  rollbackTransaction(transaction: Transaction, context: ServiceContext): Promise<ServiceResult<boolean>>;
}

/**
 * Transaction Interface
 * Standardized transaction representation
 */
export interface Transaction extends BaseEntity {
  readonly transactionId: string;
  readonly status: 'active' | 'committed' | 'rolled_back' | 'failed';
  readonly startedAt: Date;
  readonly operations: string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Service Metrics
 * Standardized service performance metrics
 */
export interface ServiceMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly cacheHitRate: number;
  readonly lastUpdated: Date;
}

/**
 * Service Health
 * Standardized service health information
 */
export interface ServiceHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly dependencies: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  readonly metrics: ServiceMetrics;
  readonly issues?: string[];
}