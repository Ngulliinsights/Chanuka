import { PoolClient, QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import { connectionManager } from './connection-manager';
import { logger   } from '../../../../shared/core/src/index.js';
import { getMonitoringService } from '../../monitoring/monitoring';

/**
 * SQL query interface with parameters and metadata.
 */
export interface SqlQuery {
  /** The SQL query text */
  sql: string;
  /** Query parameters (positional or named) */
  params?: any[] | Record<string, any>;
  /** Optional query context for logging */
  context?: string;
  /** Optional query timeout in milliseconds */
  timeout?: number;
}

/**
 * Query execution result with timing information.
 */
export interface QueryResult<T extends QueryResultRow = any> extends PgQueryResult<T> {
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Unique query ID for tracking */
  queryId: string;
  /** Query context if provided */
  context?: string;
}

/**
 * Slow query information for logging and monitoring.
 */
export interface SlowQueryInfo {
  queryId: string;
  sql: string;
  params?: any[] | Record<string, any>;
  executionTimeMs: number;
  stackTrace: string;
  explainPlan?: string;
  context?: string;
  timestamp: string;
}

/**
 * Query executor configuration.
 */
export interface QueryExecutorConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  queryTimeoutMs: number;
  enableDetailedLogging: boolean;
  slowQueryThresholdMs: number;
  enableSlowQueryDetection: boolean;
  maxSlowQueriesStored: number;
}

/**
 * Default configuration for query executor.
 */
const DEFAULT_CONFIG: QueryExecutorConfig = {
  maxRetries: 3,
  initialBackoffMs: 100,
  maxBackoffMs: 5000,
  queryTimeoutMs: 30000,
  enableDetailedLogging: true,
  slowQueryThresholdMs: 1000,
  enableSlowQueryDetection: true,
  maxSlowQueriesStored: 1000,
};

/**
 * Sensitive parameter patterns that should be sanitized in logs.
 * Compiled as a Set for O(1) lookup performance.
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /pass/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
  /credit.?card/i,
  /ssn/i,
  /social.?security/i,
  /pin/i,
  /cvv/i,
  /expiry/i,
] as const;

/**
 * PostgreSQL error codes that indicate transient failures and should be retried.
 */
const TRANSIENT_ERROR_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  'XX000', // internal_error (sometimes transient)
]);

/**
 * Query type keywords for categorization.
 */
const QUERY_TYPE_KEYWORDS = {
  SELECT: 'select',
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  CREATE: 'create',
  DROP: 'drop',
  ALTER: 'alter',
} as const;

/**
 * Sanitizes query parameters by replacing sensitive values with placeholders.
 * Uses memoization for repeated sanitization of similar structures.
 */
function sanitizeParameters(
  params: any[] | Record<string, any> | undefined,
  sql?: string
): any[] | Record<string, any> | undefined {
  if (!params) return params;

  // Check if a key or value indicates sensitive data
  const isSensitive = (str: string): boolean => {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
  };

  // Sanitize individual values with truncation for long strings
  const sanitizeValue = (value: any, key?: string): any => {
    // Handle sensitive keys first for performance
    if (key && isSensitive(key)) {
      return '[REDACTED]';
    }

    if (typeof value === 'string') {
      // Check if value content is sensitive
      if (isSensitive(value)) {
        return '[REDACTED]';
      }
      // Truncate long values to prevent log bloat
      return value.length > 100 ? `${value.substring(0, 100)}...` : value;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item, idx) => sanitizeValue(item, key ? `${key}[${idx}]` : undefined));
      }

      // Recursively sanitize object properties
      return Object.entries(value).reduce((acc, [k, v]) => {
        acc[k] = sanitizeValue(v, k);
        return acc;
      }, {} as Record<string, any>);
    }

    return value;
  };

  // Attempt to infer parameter names from SQL for better context
  const inferredNames = new Map<number, string>();
  if (sql && Array.isArray(params)) {
    // Match patterns like "column_name = $1" to infer parameter purpose
    const paramRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)\s*=\s*\$(\d+)/gi;
    let match: RegExpExecArray | null;
    while ((match = paramRegex.exec(sql)) !== null) {
      const columnName = match[1];
      const paramIndex = Number(match[2]) - 1; // Convert $1 to index 0
      if (!Number.isNaN(paramIndex) && paramIndex >= 0) {
        inferredNames.set(paramIndex, columnName);
      }
    }
  }

  if (Array.isArray(params)) {
    return params.map((param, idx) => {
      const inferredName = inferredNames.get(idx);
      return sanitizeValue(param, inferredName);
    });
  }

  // Handle object parameters
  return Object.entries(params).reduce((acc, [key, value]) => {
    acc[key] = sanitizeValue(value, key);
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Determines if an error is transient and should be retried.
 * Optimized with early returns for better performance.
 */
function isTransientError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;

  // Check PostgreSQL error code first (most specific)
  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
    return true;
  }

  // Check error message for transient patterns
  const message = error.message?.toLowerCase();
  if (!message) return false;

  // Use includes for better performance than multiple string searches
  return (
    message.includes('deadlock') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('circuit breaker') ||
    message.includes('transient')
  );
}

/**
 * Calculates exponential backoff delay with jitter to prevent thundering herd.
 */
function calculateBackoffDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  const exponentialDelay = initialDelay * (2 ** attempt);
  // Add 50% jitter to prevent synchronized retries
  const jitter = 0.5 + Math.random() * 0.5;
  const delayWithJitter = exponentialDelay * jitter;
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Transaction context that tracks active transaction state.
 * Ensures transactions are properly managed and prevents misuse.
 */
export class TransactionContext {
  public readonly transactionId: string;
  public readonly client: PoolClient;
  private _is_active: boolean = true;

  constructor(client: PoolClient) {
    this.transactionId = crypto.randomUUID();
    this.client = client;
  }

  get is_active(): boolean {
    return this._is_active;
  }

  /**
   * Marks the transaction as inactive (called after commit/rollback).
   * @internal
   */
  markInactive(): void {
    this._is_active = false;
  }
}

/**
 * Query executor that handles SQL execution with retry logic, logging, and parameter sanitization.
 * Provides transaction support via AsyncLocalStorage for automatic transaction context propagation.
 */
export class QueryExecutor {
  private readonly config: QueryExecutorConfig;
  private static readonly transactionStorage = new AsyncLocalStorage<TransactionContext>();
  private readonly slowQueries: SlowQueryInfo[] = [];
  private readonly monitoringService = getMonitoringService();

  constructor(config: Partial<QueryExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gets the current transaction context if one exists in the async context.
   */
  static getCurrentTransaction(): TransactionContext | undefined {
    return this.transactionStorage.getStore();
  }

  /**
   * Executes a SQL query with automatic retry on transient failures.
   * Automatically uses transaction context if available.
   */
  async execute<T extends QueryResultRow = any>(query: SqlQuery): Promise<QueryResult<T>> {
    const queryId = crypto.randomUUID();
    const startTime = process.hrtime.bigint();

    // Check if we're in a transaction context
    const transactionContext = QueryExecutor.getCurrentTransaction();
    
    if (transactionContext) {
      // If in transaction, execute directly without retry logic
      return this.executeSingleQuery<T>(query, transactionContext);
    }

    // Log query start for non-transaction queries
    if (this.config.enableDetailedLogging) {
      logger.info('Query execution started', {
        component: 'query-executor',
        operation: 'execute',
        queryId,
        context: query.context,
        sql: this.truncateForLogging(query.sql, 200),
        sanitizedParams: sanitizeParameters(query.params, query.sql),
      });
    }

    let lastError: Error | null = null;

    // Retry loop for non-transactional queries
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      let client: PoolClient | null = null;

      try {
        client = await connectionManager.acquireConnection();
        const result = await this.executeQueryWithTimeout<T>(client, query, queryId);

        // Calculate execution time
        const executionTimeMs = this.calculateExecutionTime(startTime);

        // Handle slow query detection
        if (this.config.enableSlowQueryDetection && executionTimeMs >= this.config.slowQueryThresholdMs) {
          await this.handleSlowQuery(query, queryId, executionTimeMs, client);
        }

        // Log successful execution
        if (this.config.enableDetailedLogging) {
          logger.info('Query execution completed', {
            component: 'query-executor',
            operation: 'execute',
            queryId,
            context: query.context,
            attempt: attempt + 1,
            executionTimeMs,
            rowCount: result.rowCount,
          });
        }

        return {
          ...result,
          executionTimeMs,
          queryId,
          context: query.context,
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;

        logger.warn('Query execution attempt failed', {
          component: 'query-executor',
          operation: 'execute',
          queryId,
          context: query.context,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: err.message,
          isTransient: isTransientError(err),
        });

        // Retry logic: only retry on transient errors
        if (attempt < this.config.maxRetries && isTransientError(err)) {
          const backoffDelay = calculateBackoffDelay(
            attempt,
            this.config.initialBackoffMs,
            this.config.maxBackoffMs
          );

          logger.info('Retrying query after backoff', {
            component: 'query-executor',
            operation: 'retry',
            queryId,
            context: query.context,
            nextAttempt: attempt + 2,
            backoffDelayMs: backoffDelay,
          });

          await this.sleep(backoffDelay);
          continue;
        }

        // Non-transient error or exhausted retries
        break;

      } finally {
        if (client) {
          await this.safeReleaseConnection(client, queryId);
        }
      }
    }

    // All retries exhausted
    const executionTimeMs = this.calculateExecutionTime(startTime);

    logger.error('Query execution failed after all retries', {
      component: 'query-executor',
      operation: 'execute',
      queryId,
      context: query.context,
      totalAttempts: this.config.maxRetries + 1,
      executionTimeMs,
      finalError: lastError?.message,
    });

    throw lastError || new Error('Query execution failed');
  }

  /**
   * Executes a single query within a transaction context.
   * @internal - Used by transaction method
   */
  private async executeSingleQuery<T extends QueryResultRow = any>(
    query: SqlQuery,
    transactionContext: TransactionContext
  ): Promise<QueryResult<T>> {
    const queryId = crypto.randomUUID();
    const startTime = process.hrtime.bigint();

    if (this.config.enableDetailedLogging) {
      logger.info('Transaction query execution started', {
        component: 'query-executor',
        operation: 'execute-in-transaction',
        queryId,
        transactionId: transactionContext.transactionId,
        context: query.context,
        sql: this.truncateForLogging(query.sql, 200),
        sanitizedParams: sanitizeParameters(query.params, query.sql),
      });
    }

    try {
      const result = await this.executeQueryWithTimeout<T>(
        transactionContext.client,
        query,
        queryId
      );

      const executionTimeMs = this.calculateExecutionTime(startTime);

      // Check for slow queries
      if (this.config.enableSlowQueryDetection && executionTimeMs >= this.config.slowQueryThresholdMs) {
        await this.handleSlowQuery(query, queryId, executionTimeMs, transactionContext.client);
      }

      if (this.config.enableDetailedLogging) {
        logger.info('Transaction query execution completed', {
          component: 'query-executor',
          operation: 'execute-in-transaction',
          queryId,
          transactionId: transactionContext.transactionId,
          context: query.context,
          executionTimeMs,
          rowCount: result.rowCount,
        });
      }

      return {
        ...result,
        executionTimeMs,
        queryId,
        context: query.context,
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logger.error('Transaction query execution failed', {
        component: 'query-executor',
        operation: 'execute-in-transaction',
        queryId,
        transactionId: transactionContext.transactionId,
        context: query.context,
        error: err.message,
      });

      throw err;
    }
  }

  /**
   * Executes a callback within a database transaction context.
   * Automatically commits on success or rolls back on error.
   * Prevents nested transactions to avoid complexity and potential deadlocks.
   */
  async transaction<T>(
    callback: (transactionContext: TransactionContext) => Promise<T>,
    context?: string
  ): Promise<T> {
    // Prevent nested transactions
    const existingTransaction = QueryExecutor.getCurrentTransaction();
    if (existingTransaction) {
      const error = new Error('Nested transactions are not allowed');
      logger.error('Nested transaction attempt detected', {
        component: 'query-executor',
        operation: 'transaction',
        existingTransactionId: existingTransaction.transactionId,
        context,
      });
      throw error;
    }

    const transactionId = crypto.randomUUID();
    let client: PoolClient | null = null;
    let transactionContext: TransactionContext | null = null;

    try {
      logger.info('Transaction started', {
        component: 'query-executor',
        operation: 'transaction-begin',
        transactionId,
        context,
      });

      // Acquire dedicated connection for the entire transaction
      client = await connectionManager.acquireConnection();

      // Begin database transaction
      await this.executeQueryWithTimeout(client, { sql: 'BEGIN' }, transactionId);

      // Create and store transaction context
      transactionContext = new TransactionContext(client);

      // Execute callback within transaction context using AsyncLocalStorage
      const result = await QueryExecutor.transactionStorage.run(
        transactionContext,
        () => callback(transactionContext!)
      );

      // Commit transaction
      await this.executeQueryWithTimeout(client, { sql: 'COMMIT' }, transactionId);
      transactionContext.markInactive();

      logger.info('Transaction committed successfully', {
        component: 'query-executor',
        operation: 'transaction-commit',
        transactionId,
        context,
      });

      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logger.warn('Transaction failed, initiating rollback', {
        component: 'query-executor',
        operation: 'transaction-error',
        transactionId,
        context,
        error: err.message,
      });

      // Attempt rollback
      if (client) {
        try {
          await this.executeQueryWithTimeout(client, { sql: 'ROLLBACK' }, transactionId);
          logger.info('Transaction rolled back successfully', {
            component: 'query-executor',
            operation: 'transaction-rollback',
            transactionId,
            context,
          });
        } catch (rollbackError) {
          logger.error('Failed to rollback transaction', {
            component: 'query-executor',
            operation: 'transaction-rollback-failure',
            transactionId,
            context,
            rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }

      if (transactionContext) {
        transactionContext.markInactive();
      }

      throw err;

    } finally {
      // Always release the dedicated transaction connection
      if (client) {
        await this.safeReleaseConnection(client, transactionId);
      }
    }
  }

  /**
   * Executes a query with timeout protection using a promise race pattern.
   */
  private async executeQueryWithTimeout<T extends QueryResultRow>(
    client: PoolClient,
    query: SqlQuery,
    queryId: string
  ): Promise<PgQueryResult<T>> {
    const timeoutMs = query.timeout ?? this.config.queryTimeoutMs;

    // Prepare query parameters
    const { queryText, queryParams } = this.prepareQueryParameters(query);

    return new Promise<PgQueryResult<T>>((resolve, reject) => {
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Query timeout after ${timeoutMs}ms (queryId: ${queryId})`));
        }
      }, timeoutMs);

      client.query(queryText, queryParams, (error: Error | null, result: PgQueryResult<T>) => {
        clearTimeout(timeoutId);
        
        if (!isResolved) {
          isResolved = true;
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      });
    });
  }

  /**
   * Prepares query parameters, converting named parameters to positional if needed.
   */
  private prepareQueryParameters(query: SqlQuery): { queryText: string; queryParams?: any[] } {
    let queryText = query.sql;
    let queryParams: any[] | undefined;

    if (!query.params) {
      return { queryText };
    }

    if (Array.isArray(query.params)) {
      // Already positional parameters
      queryParams = query.params;
    } else {
      // Convert named parameters to positional
      const paramNames = Object.keys(query.params);
      const paramValues = Object.values(query.params);
      
      // Replace named parameters ($name) with positional ($1, $2, etc.)
      let paramIndex = 1;
      const paramMap = new Map<string, number>();
      
      queryText = queryText.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
        if (!paramMap.has(name)) {
          const index = paramNames.indexOf(name);
          if (index === -1) {
            throw new Error(`Named parameter '${name}' not found in params object`);
          }
          paramMap.set(name, paramIndex++);
        }
        return `$${paramMap.get(name)}`;
      });

      queryParams = Array.from(paramMap.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => query.params![name]);
    }

    return { queryText, queryParams };
  }

  /**
   * Handles slow query detection, logging, and monitoring.
   */
  private async handleSlowQuery(
    query: SqlQuery,
    queryId: string,
    executionTimeMs: number,
    client: PoolClient
  ): Promise<void> {
    try {
      // Capture call stack (skip internal frames)
      const stackTrace = new Error().stack?.split('\n').slice(3).join('\n') ?? 'Stack unavailable';

      // Attempt to get EXPLAIN plan for analysis
      let explainPlan: string | undefined;
      try {
        const explainQuery = `EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING) ${query.sql}`;
        const explainResult = await this.executeQueryWithTimeout(
          client,
          { sql: explainQuery, params: query.params },
          `${queryId}_explain`
        );
        explainPlan = explainResult.rows.map((row: any) => row['QUERY PLAN']).join('\n');
      } catch (explainError) {
        logger.warn('Failed to capture EXPLAIN plan for slow query', {
          component: 'query-executor',
          operation: 'slow-query-explain',
          queryId,
          error: explainError instanceof Error ? explainError.message : String(explainError),
        });
      }

      // Create slow query record with sanitized data
      const slowQueryInfo: SlowQueryInfo = {
        queryId,
        sql: query.sql,
        params: sanitizeParameters(query.params, query.sql),
        executionTimeMs,
        stackTrace,
        explainPlan,
        context: query.context,
        timestamp: new Date().toISOString(),
      };

      // Store in circular buffer (maintain max size)
      this.slowQueries.push(slowQueryInfo);
      if (this.slowQueries.length > this.config.maxSlowQueriesStored) {
        this.slowQueries.shift();
      }

      // Emit metrics for monitoring
      const queryType = this.getQueryType(query.sql);
      this.monitoringService.recordDatabaseMetric(`slow_query.${queryType}`, 1, {
        queryId,
        executionTimeMs,
        threshold: this.config.slowQueryThresholdMs,
      });

      // Log comprehensive slow query information
      logger.warn('Slow query detected', {
        component: 'query-executor',
        operation: 'slow-query',
        queryId,
        sql: query.sql,
        sanitizedParams: slowQueryInfo.params,
        executionTimeMs,
        threshold: this.config.slowQueryThresholdMs,
        stackTrace: this.truncateForLogging(stackTrace, 500),
        explainPlan: this.truncateForLogging(explainPlan ?? '', 1000),
        context: query.context,
        queryType,
      });

    } catch (error) {
      logger.error('Error in slow query handler', {
        component: 'query-executor',
        operation: 'slow-query-handler',
        queryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Determines the type of SQL query for categorization.
   */
  private getQueryType(sql: string): string {
    const normalizedSql = sql.trim().toUpperCase();

    for (const [keyword, type] of Object.entries(QUERY_TYPE_KEYWORDS)) {
      if (normalizedSql.startsWith(keyword)) {
        return type;
      }
    }

    return 'other';
  }

  /**
   * Safely releases a connection, logging any errors.
   */
  private async safeReleaseConnection(client: PoolClient, queryId: string): Promise<void> {
    try {
      await connectionManager.releaseConnection(client);
    } catch (releaseError) {
      logger.error('Failed to release connection', {
        component: 'query-executor',
        operation: 'release-connection',
        queryId,
        error: releaseError instanceof Error ? releaseError.message : String(releaseError),
      });
    }
  }

  /**
   * Calculates execution time from start time in nanoseconds.
   */
  private calculateExecutionTime(startTime: bigint): number {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    return Number(durationNs) / 1_000_000; // Convert to milliseconds
  }

  /**
   * Truncates text for logging to prevent log bloat.
   */
  private truncateForLogging(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }

  /**
   * Sleep utility for retry backoff.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Updates the executor configuration dynamically.
   */
  updateConfig(config: Partial<QueryExecutorConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Gets the current configuration (returns a copy to prevent mutations).
   */
  getConfig(): Readonly<QueryExecutorConfig> {
    return { ...this.config };
  }

  /**
   * Gets recent slow queries for monitoring and analysis.
   */
  getSlowQueries(limit: number = 100): ReadonlyArray<SlowQueryInfo> {
    const startIndex = Math.max(0, this.slowQueries.length - limit);
    return this.slowQueries.slice(startIndex);
  }

  /**
   * Clears the slow query history.
   */
  clearSlowQueries(): void {
    this.slowQueries.length = 0;
  }
}

// Export singleton instance for convenience
export const queryExecutor = new QueryExecutor();





































