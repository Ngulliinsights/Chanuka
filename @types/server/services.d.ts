/**
 * Service Layer Types - Phase 3
 * Covers service interfaces, options, and return types
 */

import { BaseError, ValidationError } from '@shared/core';

// ============================================================================
// Service Result Types
// ============================================================================

/**
 * Result type for service operations
 * Used for operations that might fail in expected ways
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Service error with context
 */
export interface ServiceError {
  code: string;
  message: string;
  originalError?: Error;
  context?: Record<string, unknown>;
}

// ============================================================================
// Generic Service Interface
// ============================================================================

/**
 * Base service interface
 */
export interface IService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<boolean>;
}

/**
 * CRUD operations
 */
export interface ICrudService<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> extends IService {
  create(data: CreateInput): Promise<T>;
  read(id: string | number): Promise<T | null>;
  update(id: string | number, data: UpdateInput): Promise<T>;
  delete(id: string | number): Promise<boolean>;
  list(options?: ListOptions): Promise<PaginatedList<T>>;
}

// ============================================================================
// List and Pagination
// ============================================================================

/**
 * List operation options
 */
export interface ListOptions {
  page?: number;
  pageSize?: number;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  search?: string;
}

/**
 * Paginated list result
 */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// Search and Filter
// ============================================================================

/**
 * Search operation
 */
export interface SearchOperation {
  query: string;
  fields?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Search result
 */
export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  highlightedFields?: Record<string, string>;
}

/**
 * Filter operation
 */
export interface FilterOperation {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    input: unknown;
    error: ServiceError;
  }>;
  totalRequested: number;
  totalSuccessful: number;
  totalFailed: number;
}

/**
 * Bulk operation options
 */
export interface BulkOperationOptions {
  continueOnError: boolean;
  parallel: boolean;
  batchSize?: number;
  timeout?: number;
}

// ============================================================================
// Transaction Support
// ============================================================================

/**
 * Transaction interface for atomic operations
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * Transaction result
 */
export interface TransactionResult<T> {
  data: T;
  transaction: Transaction;
}

// ============================================================================
// Caching Service
// ============================================================================

/**
 * Cache operation result
 */
export interface CacheResult<T> {
  hit: boolean;
  data: T | null;
  fetchedAt?: number;
  expiresAt?: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  version?: number;
  tags?: string[]; // For cache invalidation
}

// ============================================================================
// Event/Hook System
// ============================================================================

/**
 * Service lifecycle hooks
 */
export interface ServiceHooks<T> {
  beforeCreate?: (data: unknown) => Promise<unknown>;
  afterCreate?: (data: T) => Promise<void>;
  beforeUpdate?: (id: string | number, data: unknown) => Promise<unknown>;
  afterUpdate?: (data: T) => Promise<void>;
  beforeDelete?: (id: string | number) => Promise<void>;
  afterDelete?: (id: string | number) => Promise<void>;
  beforeFetch?: (id: string | number) => Promise<void>;
  afterFetch?: (data: T) => Promise<void>;
}

/**
 * Event emitter interface
 */
export interface ServiceEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  once(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

// ============================================================================
// Service Dependencies
// ============================================================================

/**
 * Service configuration
 */
export interface ServiceConfig {
  enabled: boolean;
  timeout?: number;
  retries?: number;
  cache?: CacheOptions;
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
}

/**
 * Service dependency injection
 */
export interface ServiceDependencies {
  logger?: any;
  cache?: any;
  database?: any;
  eventBus?: ServiceEventEmitter;
  config?: ServiceConfig;
}

/**
 * Service factory
 */
export type ServiceFactory<T extends IService> = (
  dependencies: ServiceDependencies
) => Promise<T>;
