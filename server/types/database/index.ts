/**
 * Server Database Interaction Types
 * Standardized database interaction interfaces for consistency
 */

import { BaseEntity } from '@shared/types/core/base';

/**
 * Database Entity
 * Standardized database entity interface
 */
export interface DatabaseEntity extends BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly version?: number;
}

/**
 * Database Operation Result
 * Standardized database operation result
 */
export interface DatabaseResult<TData = unknown> {
  readonly data?: TData;
  readonly success: boolean;
  readonly error?: Error;
  readonly query?: string;
  readonly parameters?: unknown[];
  readonly executionTime?: number;
  readonly affectedRows?: number;
  readonly timestamp: Date;
}

/**
 * Database Query Options
 * Standardized query configuration
 */
export interface QueryOptions {
  readonly timeout?: number;
  readonly transaction?: Transaction;
  readonly cache?: CacheOptions;
  readonly logging?: boolean;
  readonly retryPolicy?: RetryPolicy;
}

/**
 * Cache Options
 * Standardized caching configuration for database operations
 */
export interface CacheOptions {
  readonly enabled: boolean;
  readonly ttlSeconds: number;
  readonly keyPrefix?: string;
  readonly tags?: string[];
}

/**
 * Retry Policy
 * Standardized retry configuration for database operations
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'none';
  readonly retryOnErrors?: string[];
}

/**
 * Transaction Interface
 * Standardized transaction representation
 */
export interface Transaction extends BaseEntity {
  readonly transactionId: string;
  readonly status: 'active' | 'committed' | 'rolled_back' | 'failed';
  readonly startedAt: Date;
  readonly isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  readonly operations: string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Database Repository Interface
 * Standardized repository contract
 */
export interface DatabaseRepository<TEntity extends DatabaseEntity> {
  create(entity: Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>, options?: QueryOptions): Promise<DatabaseResult<TEntity>>;
  findById(id: string, options?: QueryOptions): Promise<DatabaseResult<TEntity | null>>;
  find(filter: Partial<TEntity>, options?: QueryOptions): Promise<DatabaseResult<TEntity[]>>;
  update(id: string, updates: Partial<TEntity>, options?: QueryOptions): Promise<DatabaseResult<TEntity | null>>;
  delete(id: string, options?: QueryOptions): Promise<DatabaseResult<boolean>>;
  count(filter?: Partial<TEntity>, options?: QueryOptions): Promise<DatabaseResult<number>>;
  exists(id: string, options?: QueryOptions): Promise<DatabaseResult<boolean>>;
}

/**
 * Database Connection Interface
 * Standardized database connection contract
 */
export interface DatabaseConnection {
  query<T = unknown>(sql: string, parameters?: unknown[], options?: QueryOptions): Promise<DatabaseResult<T>>;
  execute(sql: string, parameters?: unknown[], options?: QueryOptions): Promise<DatabaseResult<number>>;
  beginTransaction(options?: TransactionOptions): Promise<DatabaseResult<Transaction>>;
  commitTransaction(transaction: Transaction): Promise<DatabaseResult<boolean>>;
  rollbackTransaction(transaction: Transaction): Promise<DatabaseResult<boolean>>;
  inTransaction<T>(callback: (transaction: Transaction) => Promise<T>, options?: TransactionOptions): Promise<DatabaseResult<T>>;
}

/**
 * Transaction Options
 * Standardized transaction configuration
 */
export interface TransactionOptions {
  readonly isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  readonly timeout?: number;
  readonly readonly?: boolean;
}

/**
 * Database Error Types
 * Comprehensive error handling for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly parameters?: unknown[],
    public readonly code?: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    public readonly isRetryable: boolean = false,
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, undefined, undefined, 'CONNECTION_ERROR', 'critical', true, metadata);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

export class QueryError extends DatabaseError {
  constructor(query: string, parameters: unknown[], message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, query, parameters, 'QUERY_ERROR', 'high', true, metadata);
    this.name = 'QueryError';
    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

export class ConstraintViolationError extends DatabaseError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, undefined, undefined, 'CONSTRAINT_VIOLATION', 'high', false, metadata);
    this.name = 'ConstraintViolationError';
    Object.setPrototypeOf(this, ConstraintViolationError.prototype);
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, undefined, undefined, 'TRANSACTION_ERROR', 'critical', true, metadata);
    this.name = 'TransactionError';
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

export class TimeoutError extends DatabaseError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, undefined, undefined, 'TIMEOUT_ERROR', 'medium', true, metadata);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Database Migration Interface
 * Standardized database migration contract
 */
export interface DatabaseMigration {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly timestamp: Date;
  readonly dependencies?: string[];
  up(connection: DatabaseConnection): Promise<DatabaseResult<void>>;
  down(connection: DatabaseConnection): Promise<DatabaseResult<void>>;
}

/**
 * Database Schema Interface
 * Standardized schema representation
 */
export interface DatabaseSchema {
  readonly name: string;
  readonly version: string;
  readonly tables: Record<string, TableDefinition>;
  readonly relationships: RelationshipDefinition[];
  readonly indexes: IndexDefinition[];
}

/**
 * Table Definition
 * Standardized table specification
 */
export interface TableDefinition {
  readonly name: string;
  readonly columns: ColumnDefinition[];
  readonly primaryKey: string | string[];
  readonly foreignKeys?: ForeignKeyDefinition[];
  readonly indexes?: IndexDefinition[];
  readonly constraints?: ConstraintDefinition[];
}

/**
 * Column Definition
 * Standardized column specification
 */
export interface ColumnDefinition {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue?: unknown;
  readonly primaryKey?: boolean;
  readonly unique?: boolean;
  readonly autoIncrement?: boolean;
  readonly comment?: string;
}

/**
 * Foreign Key Definition
 * Standardized foreign key specification
 */
export interface ForeignKeyDefinition {
  readonly name: string;
  readonly column: string;
  readonly referencedTable: string;
  readonly referencedColumn: string;
  readonly onDelete?: 'cascade' | 'set_null' | 'restrict' | 'no_action';
  readonly onUpdate?: 'cascade' | 'set_null' | 'restrict' | 'no_action';
}

/**
 * Index Definition
 * Standardized index specification
 */
export interface IndexDefinition {
  readonly name: string;
  readonly columns: string[];
  readonly unique: boolean;
  readonly type?: 'btree' | 'hash' | 'gin' | 'gist';
}

/**
 * Constraint Definition
 * Standardized constraint specification
 */
export interface ConstraintDefinition {
  readonly name: string;
  readonly type: 'check' | 'unique' | 'exclude';
  readonly expression: string;
}

/**
 * Relationship Definition
 * Standardized relationship specification
 */
export interface RelationshipDefinition {
  readonly fromTable: string;
  readonly fromColumn: string;
  readonly toTable: string;
  readonly toColumn: string;
  readonly type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  readonly cardinality: 'optional' | 'required';
}

/**
 * Database Performance Metrics
 * Standardized database performance metrics
 */
export interface DatabaseMetrics {
  readonly totalQueries: number;
  readonly successfulQueries: number;
  readonly failedQueries: number;
  readonly averageExecutionTime: number;
  readonly connectionPoolSize: number;
  readonly activeConnections: number;
  readonly waitingConnections: number;
  readonly cacheHitRate: number;
  readonly lastUpdated: Date;
}

/**
 * Database Health
 * Standardized database health information
 */
export interface DatabaseHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly connectionStatus: 'connected' | 'disconnected' | 'error';
  readonly metrics: DatabaseMetrics;
  readonly issues?: string[];
}