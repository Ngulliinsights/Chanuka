import { PoolClient, QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import { connectionManager } from './connection-manager';
import { logger } from '../../../utils/logger';
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
  /** Unique query ID */
  queryId: string;
  /** The SQL query text */
  sql: string;
  /** Query parameters */
  params?: any[] | Record<string, any>;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Stack trace showing where the query originated */
  stackTrace: string;
  /** EXPLAIN plan output */
  explainPlan?: string;
  /** Query context if provided */
  context?: string;
  /** Timestamp when query completed */
  timestamp: string;
}

/**
 * Query executor configuration.
 */
export interface QueryExecutorConfig {
  /** Maximum number of retry attempts for transient failures */
  maxRetries: number;
  /** Initial backoff delay in milliseconds */
  initialBackoffMs: number;
  /** Maximum backoff delay in milliseconds */
  maxBackoffMs: number;
  /** Query timeout in milliseconds */
  queryTimeoutMs: number;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
  /** Slow query threshold in milliseconds */
  slowQueryThresholdMs: number;
  /** Whether to enable slow query detection */
  enableSlowQueryDetection: boolean;
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
};

/**
 * Sensitive parameter patterns that should be sanitized in logs.
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
];

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
 * Sanitizes query parameters by replacing sensitive values with placeholders.
 */
function sanitizeParameters(params: any[] | Record<string, any> | undefined, sql?: string): any[] | Record<string, any> | undefined {
  if (!params) return params;

  const sanitizeValue = (value: any, key?: string): any => {
    if (typeof value === 'string') {
      // Check if the key indicates sensitive data
      if (key && SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        return '[REDACTED]';
      }

      // Check if the value itself looks sensitive
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(value))) {
        return '[REDACTED]';
      }

      // Truncate long values for logging
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(item, `array[${index}]`));
      }

      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = sanitizeValue(v, k);
      }
      return sanitized;
    }

    return value;
  };

  // Try to infer parameter names from SQL placeholders like "col = $1" when SQL is available
  const inferredNames: Record<number, string> = {};
  if (sql && Array.isArray(params)) {
    const paramRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)\s*=\s*\$([0-9]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = paramRegex.exec(sql)) !== null) {
      const name = m[1];
      const index = Number(m[2]) - 1; // convert $1 to index 0
      if (!Number.isNaN(index)) {
        inferredNames[index] = name;
      }
    }
  }

  if (Array.isArray(params)) {
    return params.map((param, index) => sanitizeValue(param, inferredNames[index] || `param${index}`));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    sanitized[key] = sanitizeValue(value, key);
  }
  return sanitized;
}

/**
 * Determines if an error is transient and should be retried.
 */
function isTransientError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;

  // Check PostgreSQL error code
  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
    return true;
  }

  // Check error message for common transient patterns
  const message = error.message?.toLowerCase() || '';
  // Consider generic transient indicators as transient as well
  return message.includes('deadlock') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('circuit breaker') ||
    message.includes('transient');
}

/**
 * Calculates exponential backoff delay with jitter.
 */
function calculateBackoffDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  const exponentialDelay = initialDelay * Math.pow(2, attempt);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add 50% jitter
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Transaction context that tracks active transaction state.
 */
export class TransactionContext {
  public readonly transactionId: string;
  public readonly client: PoolClient;
  private _isActive: boolean = true;

  constructor(client: PoolClient) {
    this.transactionId = crypto.randomUUID();
    this.client = client;
  }

  /**
   * Gets whether the transaction is currently active.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Marks the transaction as inactive (used internally after commit/rollback).
   */
  markInactive(): void {
    this._isActive = false;
  }
}

/**
 * Query executor that handles SQL execution with retry logic, logging, and parameter sanitization.
 */
export class QueryExecutor {
  private config: QueryExecutorConfig;
  private static transactionStorage = new AsyncLocalStorage<TransactionContext>();
  private slowQueries: SlowQueryInfo[] = [];
  private monitoringService = getMonitoringService();

  constructor(config: Partial<QueryExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gets the current transaction context if one exists.
   */
  static getCurrentTransaction(): TransactionContext | undefined {
    return this.transactionStorage.getStore();
  }

  /**
   * Executes a single query within a transaction context.
   * This method is used internally by the transaction method.
   */
  protected async executeSingleQuery<T extends QueryResultRow = any>(
    query: SqlQuery,
    transactionContext?: TransactionContext
  ): Promise<QueryResult<T>> {
    const queryId = crypto.randomUUID();
    const startTime = process.hrtime.bigint();

    // Log query start
    if (this.config.enableDetailedLogging) {
      logger.info(`Single query execution started`, {
        component: 'query-executor',
        operation: 'execute-single',
        queryId,
        context: query.context,
        sql: query.sql.substring(0, 200) + (query.sql.length > 200 ? '...' : ''),
        sanitizedParams: sanitizeParameters(query.params, query.sql),
        inTransaction: !!transactionContext,
        transactionId: transactionContext?.transactionId,
      });
    }

    let client: PoolClient | null = null;
    let useTransactionClient = false;

    try {
      // Use transaction client if available, otherwise acquire a new one
      if (transactionContext) {
        client = transactionContext.client;
        useTransactionClient = true;
      } else {
        client = await connectionManager.acquireConnection();
      }

      // Execute query with timeout
      const result = await this.executeQueryWithTimeout<T>(client, query, queryId);

      // Calculate execution time
      const endTime = process.hrtime.bigint();
      const executionTimeNs = endTime - startTime;
      const executionTimeMs = Number(executionTimeNs) / 1_000_000;

      // Check for slow query and handle it
      if (this.config.enableSlowQueryDetection && executionTimeMs >= this.config.slowQueryThresholdMs) {
        await this.handleSlowQuery(query, queryId, executionTimeMs, client);
      }

      // Log successful execution
      if (this.config.enableDetailedLogging) {
        logger.info(`Single query execution completed`, {
          component: 'query-executor',
          operation: 'execute-single',
          queryId,
          context: query.context,
          executionTimeMs,
          rowCount: result.rowCount,
          inTransaction: !!transactionContext,
          transactionId: transactionContext?.transactionId,
        });
      }

      // Return enhanced result
      return {
        ...result,
        executionTimeMs,
        queryId,
        context: query.context,
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error
      logger.error(`Single query execution failed`, {
        component: 'query-executor',
        operation: 'execute-single',
        queryId,
        context: query.context,
        error: err.message,
        inTransaction: !!transactionContext,
        transactionId: transactionContext?.transactionId,
      });

      throw err;

    } finally {
      // Only release the connection if we acquired it (not in transaction)
      if (client && !useTransactionClient) {
        try {
          await connectionManager.releaseConnection(client);
        } catch (releaseError) {
          logger.error(`Failed to release connection`, {
            component: 'query-executor',
            operation: 'release-connection',
            queryId,
            error: releaseError instanceof Error ? releaseError.message : String(releaseError),
          });
        }
      }
    }
  }

  /**
   * Executes a SQL query with automatic retry on transient failures.
   */
  async execute<T extends QueryResultRow = any>(query: SqlQuery): Promise<QueryResult<T>> {
    const queryId = crypto.randomUUID();
    const startTime = process.hrtime.bigint();

    // Log query start
    if (this.config.enableDetailedLogging) {
      logger.info(`Query execution started`, {
        component: 'query-executor',
        operation: 'execute',
        queryId,
        context: query.context,
        sql: query.sql.substring(0, 200) + (query.sql.length > 200 ? '...' : ''),
        sanitizedParams: sanitizeParameters(query.params, query.sql),
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      let client: PoolClient | null = null;

      try {
        // Acquire connection
        client = await connectionManager.acquireConnection();

        // Execute query with timeout
        const result = await this.executeQueryWithTimeout<T>(client, query, queryId);

        // Calculate execution time
        const endTime = process.hrtime.bigint();
        const executionTimeNs = endTime - startTime;
        const executionTimeMs = Number(executionTimeNs) / 1_000_000; // Convert to milliseconds

        // Check for slow query and handle it
        if (this.config.enableSlowQueryDetection && executionTimeMs >= this.config.slowQueryThresholdMs) {
          await this.handleSlowQuery(query, queryId, executionTimeMs, client);
        }

        // Log successful execution
        if (this.config.enableDetailedLogging) {
          logger.info(`Query execution completed`, {
            component: 'query-executor',
            operation: 'execute',
            queryId,
            context: query.context,
            attempt: attempt + 1,
            executionTimeMs,
            rowCount: result.rowCount,
          });
        }

        // Return enhanced result
        return {
          ...result,
          executionTimeMs,
          queryId,
          context: query.context,
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;

        // Log the error
        logger.warn(`Query execution attempt failed`, {
          component: 'query-executor',
          operation: 'execute',
          queryId,
          context: query.context,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: err.message,
          isTransient: isTransientError(err),
        });

        // If this is not the last attempt and the error is transient, wait and retry
        if (attempt < this.config.maxRetries && isTransientError(err)) {
          const backoffDelay = calculateBackoffDelay(attempt, this.config.initialBackoffMs, this.config.maxBackoffMs);

          logger.info(`Retrying query after backoff delay`, {
            component: 'query-executor',
            operation: 'retry',
            queryId,
            context: query.context,
            attempt: attempt + 1,
            backoffDelayMs: backoffDelay,
          });

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // If we've exhausted retries or error is not transient, throw
        break;

      } finally {
        // Always release the connection
        if (client) {
          try {
            await connectionManager.releaseConnection(client);
          } catch (releaseError) {
            logger.error(`Failed to release connection`, {
              component: 'query-executor',
              operation: 'release-connection',
              queryId,
              error: releaseError instanceof Error ? releaseError.message : String(releaseError),
            });
          }
        }
      }
    }

    // All retries exhausted, throw the last error
    const executionTimeMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    logger.error(`Query execution failed after all retries`, {
      component: 'query-executor',
      operation: 'execute',
      queryId,
      context: query.context,
      attempts: this.config.maxRetries + 1,
      executionTimeMs,
      finalError: lastError?.message,
    });

    throw lastError || new Error('Query execution failed');
  }

  /**
   * Executes a query with timeout protection.
   */
  private async executeQueryWithTimeout<T extends QueryResultRow>(
    client: PoolClient,
    query: SqlQuery,
    queryId: string
  ): Promise<PgQueryResult<T>> {
    const timeoutMs = query.timeout || this.config.queryTimeoutMs;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Prepare query parameters
      let queryText = query.sql;
      let queryParams: any[] | undefined;

      if (query.params) {
        if (Array.isArray(query.params)) {
          queryParams = query.params;
        } else {
          // Convert named parameters to positional
          const paramNames = Object.keys(query.params);
          const paramValues = Object.values(query.params);
          queryParams = paramValues;

          // Replace named parameters with positional placeholders
          let paramIndex = 1;
          queryText = queryText.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
            const index = paramNames.indexOf(name);
            if (index === -1) {
              throw new Error(`Named parameter '${name}' not found in params`);
            }
            return `$${paramIndex++}`;
          });
        }
      }

      (client.query as any)(queryText, queryParams, (error: Error | null, result: PgQueryResult<T>) => {
        clearTimeout(timeoutId);

        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Updates the executor configuration.
   */
  updateConfig(config: Partial<QueryExecutorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Executes a callback within a database transaction context.
   * Automatically commits on success or rolls back on error.
   * Prevents nested transactions.
   */
  async transaction<T>(
    callback: (transactionContext: TransactionContext) => Promise<T>,
    context?: string
  ): Promise<T> {
    // Check for nested transaction
    const existingTransaction = QueryExecutor.getCurrentTransaction();
    if (existingTransaction) {
      logger.error(`Nested transaction detected`, {
        component: 'query-executor',
        operation: 'transaction',
        existingTransactionId: existingTransaction.transactionId,
        context,
      });
      throw new Error('Nested transactions are not allowed');
    }

    const transactionId = crypto.randomUUID();
    let client: PoolClient | null = null;
    let transactionContext: TransactionContext | null = null;

    try {
      // Log transaction start
      logger.info(`Transaction started`, {
        component: 'query-executor',
        operation: 'transaction-begin',
        transactionId,
        context,
      });

      // Acquire dedicated connection for transaction
      client = await connectionManager.acquireConnection();

      // Begin database transaction
      await this.executeQueryWithTimeout(client, { sql: 'BEGIN' }, transactionId);

      // Create transaction context
      transactionContext = new TransactionContext(client);

      // Execute callback within transaction context
      const result = await QueryExecutor.transactionStorage.run(transactionContext, () => callback(transactionContext!));

      // Commit transaction
      await this.executeQueryWithTimeout(client, { sql: 'COMMIT' }, transactionId);

      // Mark transaction as inactive
      transactionContext.markInactive();

      // Log successful commit
      logger.info(`Transaction committed`, {
        component: 'query-executor',
        operation: 'transaction-commit',
        transactionId,
        context,
      });

      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log transaction error
      logger.warn(`Transaction failed, rolling back`, {
        component: 'query-executor',
        operation: 'transaction-rollback',
        transactionId,
        context,
        error: err.message,
      });

      // Attempt to rollback transaction
      if (client) {
        try {
          await this.executeQueryWithTimeout(client, { sql: 'ROLLBACK' }, transactionId);
          logger.info(`Transaction rolled back`, {
            component: 'query-executor',
            operation: 'transaction-rollback',
            transactionId,
            context,
          });
        } catch (rollbackError) {
          logger.error(`Failed to rollback transaction`, {
            component: 'query-executor',
            operation: 'transaction-rollback',
            transactionId,
            context,
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }

      // Mark transaction as inactive if it exists
      if (transactionContext) {
        transactionContext.markInactive();
      }

      throw err;

    } finally {
      // Always release the connection
      if (client) {
        try {
          await connectionManager.releaseConnection(client);
        } catch (releaseError) {
          logger.error(`Failed to release transaction connection`, {
            component: 'query-executor',
            operation: 'release-connection',
            transactionId,
            context,
            error: releaseError instanceof Error ? releaseError.message : String(releaseError),
          });
        }
      }
    }
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): QueryExecutorConfig {
    return { ...this.config };
  }

  /**
   * Gets recent slow queries for monitoring.
   */
  getSlowQueries(limit: number = 100): SlowQueryInfo[] {
    return this.slowQueries.slice(-limit);
  }

  /**
   * Clears the slow query history.
   */
  clearSlowQueries(): void {
    this.slowQueries = [];
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
      // Capture stack trace (skip first 2 frames to avoid internal calls)
      const stackTrace = new Error().stack?.split('\n').slice(3).join('\n') || 'Stack trace unavailable';

      // Get EXPLAIN plan for the query
      let explainPlan: string | undefined;
      try {
        const explainQuery = `EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING) ${query.sql}`;
        const explainResult = await this.executeQueryWithTimeout(client, { sql: explainQuery, params: query.params }, queryId + '_explain');
        explainPlan = explainResult.rows.map((row: any) => row['QUERY PLAN']).join('\n');
      } catch (explainError) {
        logger.warn(`Failed to get EXPLAIN plan for slow query`, {
          component: 'query-executor',
          operation: 'slow-query-explain',
          queryId,
          error: explainError instanceof Error ? explainError.message : String(explainError),
        });
      }

      // Create slow query info (store sanitized params)
      const sanitizedParams = sanitizeParameters(query.params, query.sql);
      const slowQueryInfo: SlowQueryInfo = {
        queryId,
        sql: query.sql,
        params: sanitizedParams,
        executionTimeMs,
        stackTrace,
        explainPlan,
        context: query.context,
        timestamp: new Date().toISOString(),
      };

      // Store in memory (keep last 1000 slow queries)
      this.slowQueries.push(slowQueryInfo);
      if (this.slowQueries.length > 1000) {
        this.slowQueries.shift();
      }

      // Determine query type for metrics
      const queryType = this.getQueryType(query.sql);

      // Emit metrics
      this.monitoringService.recordDatabaseMetric(`slow_query.${queryType}`, 1, {
        queryId,
        executionTimeMs,
        threshold: this.config.slowQueryThresholdMs,
      });

      // Log slow query with full details
      logger.warn(`Slow query detected`, {
        component: 'query-executor',
        operation: 'slow-query',
        queryId,
        sql: query.sql,
        sanitizedParams,
        executionTimeMs,
        threshold: this.config.slowQueryThresholdMs,
        stackTrace: stackTrace.substring(0, 500), // Limit stack trace length
        explainPlan: explainPlan?.substring(0, 1000), // Limit explain plan length
        context: query.context,
        queryType,
      });

    } catch (error) {
      logger.error(`Failed to handle slow query`, {
        component: 'query-executor',
        operation: 'slow-query-handler',
        queryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Determines the type of SQL query for metrics categorization.
   */
  private getQueryType(sql: string): string {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith('SELECT')) {
      return 'select';
    } else if (normalizedSql.startsWith('INSERT')) {
      return 'insert';
    } else if (normalizedSql.startsWith('UPDATE')) {
      return 'update';
    } else if (normalizedSql.startsWith('DELETE')) {
      return 'delete';
    } else if (normalizedSql.startsWith('CREATE')) {
      return 'create';
    } else if (normalizedSql.startsWith('DROP')) {
      return 'drop';
    } else if (normalizedSql.startsWith('ALTER')) {
      return 'alter';
    } else {
      return 'other';
    }
  }
}

// Export default instance
export const queryExecutor = new QueryExecutor();