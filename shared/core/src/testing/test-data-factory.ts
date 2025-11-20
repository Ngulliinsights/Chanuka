/**
 * Test Data Factory and Database Operations Interfaces
 *
 * Provides schema-agnostic interfaces for test data generation and database operations
 * to enable decoupled testing across different database schemas and environments.
 */

import type { Result, Maybe, UserId, Timestamp } from '../primitives';

// Define missing branded types for now
export type BillId = string & { readonly __brand: 'BillId' };
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * Represents a database entity with common metadata fields
 */
export interface DatabaseEntity {
  id: string | number;
  created_at: Timestamp;
  updated_at: Timestamp;
  version?: number;
}

/**
 * Configuration for test data generation
 */
export interface TestDataConfig {
  /** Number of records to generate */
  count?: number;
  /** Whether to include related entities */
  includeRelations?: boolean;
  /** Custom overrides for generated data */
  overrides?: Record<string, unknown>;
  /** Seed for reproducible random data */
  seed?: number;
}

/**
 * Result of a database operation
 */
export interface DatabaseOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  affectedRows?: number;
  error?: string;
  executionTime?: number;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
}

/**
 * Query execution options
 */
export interface QueryOptions {
  timeout?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

/**
 * ITestDataFactory - Interface for generating test data
 *
 * Provides methods to create realistic test data for different entity types
 * while maintaining referential integrity and supporting various test scenarios.
 */
export interface ITestDataFactory {
  /**
   * Creates a single user entity with realistic test data
   * @param config Configuration for data generation
   * @returns Promise resolving to generated user data
   */
  createUser(config?: TestDataConfig): Promise<Result<DatabaseEntity & {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    role: string;
  }, Error>>;

  /**
   * Creates multiple user entities
   * @param config Configuration for data generation
   * @returns Promise resolving to array of generated users
   */
  createUsers(config?: TestDataConfig): Promise<Result<DatabaseEntity[], Error>>;

  /**
   * Creates a bill entity with associated data
   * @param config Configuration including optional sponsor user ID
   * @returns Promise resolving to generated bill data
   */
  createBill(config?: TestDataConfig & { sponsor_id?: UserId }): Promise<Result<DatabaseEntity & {
    title: string;
    summary: string;
    status: string;
    bill_number: string;
    sponsor_id: UserId;
    introduced_date: Date;
    current_reading?: number;
  }, Error>>;

  /**
   * Creates multiple bill entities
   * @param config Configuration for data generation
   * @returns Promise resolving to array of generated bills
   */
  createBills(config?: TestDataConfig): Promise<Result<DatabaseEntity[], Error>>;

  /**
   * Creates a citizen participation record
   * @param config Configuration including user and bill IDs
   * @returns Promise resolving to generated participation data
   */
  createParticipation(config?: TestDataConfig & {
    user_id?: UserId;
    bill_id?: BillId;
  }): Promise<Result<DatabaseEntity & {
    user_id: UserId;
    bill_id: BillId;
    participation_type: string;
    content: string;
    is_public: boolean;
    submitted_at: Date;
  }, Error>>;

  /**
   * Creates test data for a complete scenario (user + bill + participation)
   * @param config Configuration for the scenario
   * @returns Promise resolving to complete test scenario data
   */
  createScenario(config?: TestDataConfig): Promise<Result<{
    user: DatabaseEntity;
    bill: DatabaseEntity;
    participation: DatabaseEntity;
  }, Error>>;

  /**
   * Cleans up all test data created by this factory
   * @returns Promise resolving when cleanup is complete
   */
  cleanup(): Promise<Result<void, Error>>;
}

/**
 * IDatabaseOperations - Interface for database operations in tests
 *
 * Provides schema-agnostic methods for common database operations needed in testing,
 * allowing tests to work across different database implementations and schemas.
 */
export interface IDatabaseOperations {
  /**
   * Establishes a connection to the test database
   * @param config Database connection configuration
   * @returns Promise resolving when connection is established
   */
  connect(config: DatabaseConfig): Promise<Result<void, Error>>;

  /**
   * Closes the database connection
   * @returns Promise resolving when connection is closed
   */
  disconnect(): Promise<Result<void, Error>>;

  /**
   * Executes a raw SQL query
   * @param sql SQL query string
   * @param params Query parameters
   * @param options Query execution options
   * @returns Promise resolving to query result
   */
  executeQuery<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<Result<T[], Error>>;

  /**
   * Executes a SQL query that returns a single row
   * @param sql SQL query string
   * @param params Query parameters
   * @param options Query execution options
   * @returns Promise resolving to single row or null
   */
  executeQuerySingle<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<Result<Maybe<T>, Error>>;

  /**
   * Executes a SQL command (INSERT, UPDATE, DELETE)
   * @param sql SQL command string
   * @param params Command parameters
   * @param options Command execution options
   * @returns Promise resolving to operation result
   */
  executeCommand(
    sql: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<Result<DatabaseOperationResult, Error>>;

  /**
   * Begins a database transaction
   * @returns Promise resolving to transaction object
   */
  beginTransaction(): Promise<Result<ITransaction, Error>>;

  /**
   * Checks if a table exists in the database
   * @param tableName Name of the table to check
   * @returns Promise resolving to boolean indicating existence
   */
  tableExists(tableName: string): Promise<Result<boolean, Error>>;

  /**
   * Gets the row count for a table
   * @param tableName Name of the table
   * @param whereClause Optional WHERE clause for filtering
   * @param params Parameters for WHERE clause
   * @returns Promise resolving to row count
   */
  getRowCount(
    tableName: string,
    whereClause?: string,
    params?: unknown[]
  ): Promise<Result<number, Error>>;

  /**
   * Truncates a table (removes all rows)
   * @param tableName Name of the table to truncate
   * @param cascade Whether to cascade to related tables
   * @returns Promise resolving when truncation is complete
   */
  truncateTable(tableName: string, cascade?: boolean): Promise<Result<void, Error>>;

  /**
   * Gets database schema information
   * @param tableName Optional table name to get schema for
   * @returns Promise resolving to schema information
   */
  getSchema(tableName?: string): Promise<Result<DatabaseSchema, Error>>;

  /**
   * Creates a backup of current database state
   * @param name Backup identifier
   * @returns Promise resolving when backup is complete
   */
  createBackup(name: string): Promise<Result<string, Error>>;

  /**
   * Restores database from a backup
   * @param name Backup identifier
   * @returns Promise resolving when restore is complete
   */
  restoreBackup(name: string): Promise<Result<void, Error>>;

  /**
   * Gets database health and performance metrics
   * @returns Promise resolving to database metrics
   */
  getMetrics(): Promise<Result<DatabaseMetrics, Error>>;
}

/**
 * Database transaction interface
 */
export interface ITransaction {
  /**
   * Executes a query within the transaction
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Promise resolving to query result
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<Result<T[], Error>>;

  /**
   * Commits the transaction
   * @returns Promise resolving when commit is complete
   */
  commit(): Promise<Result<void, Error>>;

  /**
   * Rolls back the transaction
   * @returns Promise resolving when rollback is complete
   */
  rollback(): Promise<Result<void, Error>>;
}

/**
 * Database schema information
 */
export interface DatabaseSchema {
  tables: TableSchema[];
  version?: string;
  dialect: string;
}

/**
 * Table schema information
 */
export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeySchema[];
  indexes?: IndexSchema[];
}

/**
 * Column schema information
 */
export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

/**
 * Foreign key schema information
 */
export interface ForeignKeySchema {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

/**
 * Index schema information
 */
export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

/**
 * Database performance and health metrics
 */
export interface DatabaseMetrics {
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  p95QueryTime: number;
  p99QueryTime: number;
  deadlockCount: number;
  cacheHitRate?: number;
  diskUsage?: number;
  uptime: number;
}

