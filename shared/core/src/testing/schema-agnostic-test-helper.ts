/**
 * Schema-Agnostic Test Helper Interface
 *
 * Provides utilities for testing that work across different database schemas
 * and data structures, enabling consistent test patterns regardless of underlying schema.
 */

import type { Result, Maybe, UserId, Timestamp } from '../primitives';

// Define missing branded types for now
export type BillId = string & { readonly __brand: 'BillId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
import type { DatabaseEntity, TestDataConfig, DatabaseOperationResult } from './test-data-factory';

/**
 * Test assertion configuration
 */
export interface AssertionConfig {
  /** Whether to perform strict equality checks */
  strict?: boolean;
  /** Whether to ignore certain fields in comparisons */
  ignoreFields?: string[];
  /** Custom comparison function */
  customCompare?: (actual: unknown, expected: unknown) => boolean;
  /** Timeout for async assertions */
  timeout?: number;
}

/**
 * Test cleanup configuration
 */
export interface CleanupConfig {
  /** Tables to truncate */
  tables?: string[];
  /** Whether to cascade deletions */
  cascade?: boolean;
  /** Whether to preserve certain data */
  preserveData?: Record<string, unknown[]>;
  /** Custom cleanup functions */
  customCleanup?: Array<() => Promise<void>>;
}

/**
 * Test execution context
 */
export interface TestContext {
  /** Unique test identifier */
  testId: string;
  /** Test start timestamp */
  startTime: Timestamp;
  /** Test metadata */
  metadata: Record<string, unknown>;
  /** Resources to clean up after test */
  resources: TestResource[];
}

/**
 * Test resource for cleanup
 */
export interface TestResource {
  type: 'database' | 'file' | 'network' | 'memory';
  identifier: string;
  cleanup: () => Promise<void>;
}

/**
 * Database assertion result
 */
export interface DatabaseAssertion {
  passed: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
  query?: string;
  executionTime?: number;
}

/**
 * Performance benchmark result
 */
export interface PerformanceResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  minTime: number;
  maxTime: number;
  memoryDelta?: number;
}

/**
 * ITestHelper - Interface for schema-agnostic test utilities
 *
 * Provides testing utilities that work across different database schemas and
 * data structures, enabling consistent test patterns and assertions.
 */
export interface ITestHelper {
  /**
   * Creates a test execution context for tracking resources and cleanup
   * @param testName Name of the test
   * @param metadata Additional test metadata
   * @returns Test context for resource management
   */
  createTestContext(testName: string, metadata?: Record<string, unknown>): TestContext;

  /**
   * Registers a resource for cleanup after test completion
   * @param context Test context
   * @param resource Resource to register
   */
  registerResource(context: TestContext, resource: TestResource): void;

  /**
   * Cleans up all resources registered in the test context
   * @param context Test context
   * @returns Promise resolving when cleanup is complete
   */
  cleanupTestContext(context: TestContext): Promise<Result<void, Error>>;

  /**
   * Asserts that a database table contains expected data
   * @param tableName Name of the table to check
   * @param expectedData Expected data (can be partial)
   * @param whereClause Optional WHERE clause for filtering
   * @param config Assertion configuration
   * @returns Promise resolving to assertion result
   */
  assertTableContains(
    tableName: string,
    expectedData: Record<string, unknown>,
    whereClause?: string,
    config?: AssertionConfig
  ): Promise<Result<DatabaseAssertion, Error>>;

  /**
   * Asserts that a database table has a specific number of rows
   * @param tableName Name of the table to check
   * @param expectedCount Expected row count
   * @param whereClause Optional WHERE clause for filtering
   * @param config Assertion configuration
   * @returns Promise resolving to assertion result
   */
  assertTableRowCount(
    tableName: string,
    expectedCount: number,
    whereClause?: string,
    config?: AssertionConfig
  ): Promise<Result<DatabaseAssertion, Error>>;

  /**
   * Asserts that a database query returns expected results
   * @param sql SQL query to execute
   * @param expectedResults Expected query results
   * @param params Query parameters
   * @param config Assertion configuration
   * @returns Promise resolving to assertion result
   */
  assertQueryResult(
    sql: string,
    expectedResults: unknown[],
    params?: unknown[],
    config?: AssertionConfig
  ): Promise<Result<DatabaseAssertion, Error>>;

  /**
   * Asserts that two database entities are equivalent
   * @param actual Actual entity data
   * @param expected Expected entity data
   * @param config Assertion configuration
   * @returns Promise resolving to assertion result
   */
  assertEntityEquals(
    actual: DatabaseEntity,
    expected: Partial<DatabaseEntity>,
    config?: AssertionConfig
  ): Promise<Result<DatabaseAssertion, Error>>;

  /**
   * Asserts that a database operation completed successfully
   * @param operation Operation to check
   * @param result Operation result
   * @param expectedAffectedRows Expected number of affected rows
   * @returns Promise resolving to assertion result
   */
  assertOperationSuccess(
    operation: string,
    result: DatabaseOperationResult,
    expectedAffectedRows?: number
  ): Promise<Result<DatabaseAssertion, Error>>;

  /**
   * Waits for a condition to become true with timeout
   * @param condition Function that returns true when condition is met
   * @param timeout Maximum time to wait in milliseconds
   * @param interval Interval between checks in milliseconds
   * @returns Promise resolving when condition is met or rejecting on timeout
   */
  waitForCondition(
    condition: () => Promise<boolean>,
    timeout?: number,
    interval?: number
  ): Promise<Result<void, Error>>;

  /**
   * Waits for data to appear in a database table
   * @param tableName Name of the table to monitor
   * @param condition Function to check if data meets criteria
   * @param timeout Maximum time to wait
   * @param interval Check interval
   * @returns Promise resolving to the found data or rejecting on timeout
   */
  waitForData<T = unknown>(
    tableName: string,
    condition: (data: T[]) => boolean,
    timeout?: number,
    interval?: number
  ): Promise<Result<T[], Error>>;

  /**
   * Performs a performance benchmark on a database operation
   * @param operation Function to benchmark
   * @param iterations Number of iterations to run
   * @param warmupIterations Number of warmup iterations
   * @returns Promise resolving to performance results
   */
  benchmarkOperation(
    operation: () => Promise<void>,
    iterations?: number,
    warmupIterations?: number
  ): Promise<Result<PerformanceResult, Error>>;

  /**
   * Compares performance between two operations
   * @param baselineOperation Baseline operation function
   * @param comparisonOperation Comparison operation function
   * @param iterations Number of iterations for each operation
   * @returns Promise resolving to performance comparison
   */
  comparePerformance(
    baselineOperation: () => Promise<void>,
    comparisonOperation: () => Promise<void>,
    iterations?: number
  ): Promise<Result<PerformanceComparison, Error>>;

  /**
   * Generates a snapshot of current database state for comparison
   * @param tables Tables to include in snapshot
   * @param name Snapshot identifier
   * @returns Promise resolving when snapshot is created
   */
  createDatabaseSnapshot(
    tables: string[],
    name: string
  ): Promise<Result<string, Error>>;

  /**
   * Compares current database state with a snapshot
   * @param snapshotName Name of the snapshot to compare against
   * @param config Comparison configuration
   * @returns Promise resolving to comparison results
   */
  compareDatabaseSnapshot(
    snapshotName: string,
    config?: SnapshotComparisonConfig
  ): Promise<Result<SnapshotComparison, Error>>;

  /**
   * Validates data integrity constraints
   * @param tableName Table to validate
   * @param constraints Constraints to check
   * @returns Promise resolving to validation results
   */
  validateDataIntegrity(
    tableName: string,
    constraints: DataIntegrityConstraint[]
  ): Promise<Result<DataIntegrityResult[], Error>>;

  /**
   * Sets up test data isolation for a test
   * @param config Cleanup configuration
   * @returns Promise resolving to isolation setup result
   */
  setupDataIsolation(config: CleanupConfig): Promise<Result<void, Error>>;

  /**
   * Tears down test data isolation
   * @param config Cleanup configuration
   * @returns Promise resolving to cleanup result
   */
  teardownDataIsolation(config: CleanupConfig): Promise<Result<void, Error>>;
}

/**
 * Performance comparison between two operations
 */
export interface PerformanceComparison {
  baseline: PerformanceResult;
  comparison: PerformanceResult;
  improvement: number; // Percentage improvement (positive = faster)
  statisticalSignificance: boolean;
  recommendation: string;
}

/**
 * Database snapshot comparison configuration
 */
export interface SnapshotComparisonConfig {
  /** Whether to ignore certain columns */
  ignoreColumns?: string[];
  /** Whether to perform deep comparison of objects */
  deepCompare?: boolean;
  /** Tolerance for numeric comparisons */
  numericTolerance?: number;
  /** Whether to compare row counts only */
  countOnly?: boolean;
}

/**
 * Database snapshot comparison result
 */
export interface SnapshotComparison {
  identical: boolean;
  differences: SnapshotDifference[];
  summary: {
    tablesCompared: number;
    tablesDifferent: number;
    totalRowsCompared: number;
    rowsDifferent: number;
  };
}

/**
 * Difference found in snapshot comparison
 */
export interface SnapshotDifference {
  table: string;
  type: 'missing_row' | 'extra_row' | 'different_data' | 'different_count';
  details: Record<string, unknown>;
}

/**
 * Data integrity constraint definition
 */
export interface DataIntegrityConstraint {
  type: 'not_null' | 'unique' | 'foreign_key' | 'check' | 'custom';
  column?: string;
  constraint?: string;
  customValidator?: (value: unknown) => boolean;
  errorMessage?: string;
}

/**
 * Data integrity validation result
 */
export interface DataIntegrityResult {
  constraint: DataIntegrityConstraint;
  passed: boolean;
  violations: Array<{
    rowId?: string | number;
    column?: string;
    value?: unknown;
    message: string;
  }>;
  executionTime: number;
}

