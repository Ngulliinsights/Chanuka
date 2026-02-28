/**
 * Transaction Manager
 *
 * Manages database transactions with retry logic and circuit breaker protection.
 * Extracted from connection.ts to provide focused transaction management.
 */

import type { PoolClient } from 'pg';

import { logger } from '../../observability/core/logger';
import { RetryStrategy, CircuitBreakerStrategy } from '../strategies';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TransactionOptions {
  /** Maximum retry attempts for transient failures (default: 0) */
  maxRetries?: number;
  /** Callback invoked after each failed attempt */
  onError?: (error: Error, attempt: number) => void;
  /** Transaction timeout in milliseconds (optional) */
  timeout?: number;
  /** Custom delay calculation between retries */
  retryDelay?: (attempt: number) => number;
  /** Enable circuit breaker protection */
  enableCircuitBreaker?: boolean;
}

export interface TransactionManagerConfig {
  enableRetry?: boolean;
  maxRetries?: number;
  baseRetryDelay?: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  circuitBreakerResetTimeout?: number;
}

/**
 * Database transaction interface for type-safe transaction operations.
 */
export interface DatabaseTransaction {
  /** Execute a query within the transaction */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  /** Commit the transaction */
  commit(): Promise<void>;
  /** Rollback the transaction */
  rollback(): Promise<void>;
  /** Check if transaction is still active */
  isActive(): boolean;
  /** Get the underlying client */
  getClient(): PoolClient;
}

// ============================================================================
// Transaction Manager Class
// ============================================================================

/**
 * TransactionManager
 *
 * Manages database transactions with automatic retry, circuit breaker protection,
 * and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const manager = new TransactionManager({
 *   enableRetry: true,
 *   maxRetries: 3,
 *   enableCircuitBreaker: true
 * });
 *
 * const result = await manager.execute(
 *   client,
 *   async (tx) => {
 *     await tx.query('UPDATE accounts SET balance = balance - 100 WHERE id = $1', [1]);
 *     await tx.query('UPDATE accounts SET balance = balance + 100 WHERE id = $1', [2]);
 *     return { success: true };
 *   }
 * );
 * ```
 */
export class TransactionManager {
  private config: Required<TransactionManagerConfig>;
  private retryStrategy?: RetryStrategy;
  private circuitBreaker?: CircuitBreakerStrategy;

  constructor(config: TransactionManagerConfig = {}) {
    this.config = {
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      baseRetryDelay: config.baseRetryDelay ?? 1000,
      enableCircuitBreaker: config.enableCircuitBreaker ?? false,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout ?? 60000,
      circuitBreakerResetTimeout: config.circuitBreakerResetTimeout ?? 300000,
    };

    // Initialize retry strategy if enabled
    if (this.config.enableRetry) {
      this.retryStrategy = new RetryStrategy({
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseRetryDelay,
        onRetry: (error, attempt, delay) => {
          logger.warn({
            component: 'TransactionManager',
            attempt,
            delay,
            error: error.message,
          }, 'Retrying transaction');
        },
      });
    }

    // Initialize circuit breaker if enabled
    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreakerStrategy({
        threshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout,
        resetTimeout: this.config.circuitBreakerResetTimeout,
      });
    }
  }

  /**
   * Execute a transaction with retry and circuit breaker protection
   *
   * @param client - PostgreSQL client to use for the transaction
   * @param callback - Function containing transaction operations
   * @param options - Transaction execution options
   * @returns Result from the callback function
   */
  async execute<T>(
    client: PoolClient,
    callback: (tx: DatabaseTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const operation = async () => {
      return await this.executeTransaction(client, callback, options);
    };

    // Apply circuit breaker if enabled
    if (this.circuitBreaker && (options.enableCircuitBreaker ?? this.config.enableCircuitBreaker)) {
      return await this.circuitBreaker.execute(operation);
    }

    // Apply retry if enabled
    if (this.retryStrategy && (options.maxRetries ?? this.config.maxRetries) > 0) {
      return await this.retryStrategy.execute(operation);
    }

    // Execute without protection
    return await operation();
  }

  /**
   * Execute the actual transaction
   */
  private async executeTransaction<T>(
    client: PoolClient,
    callback: (tx: DatabaseTransaction) => Promise<T>,
    options: TransactionOptions
  ): Promise<T> {
    let isActive = true;
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Setup timeout if specified
      if (options.timeout) {
        timeoutHandle = setTimeout(async () => {
          if (isActive) {
            try {
              await client.query('ROLLBACK');
              isActive = false;
            } catch (error) {
              logger.error({ error }, 'Error rolling back timed out transaction');
            }
          }
        }, options.timeout);
      }

      // Create transaction object
      const transaction: DatabaseTransaction = {
        async query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
          if (!isActive) {
            throw new Error('Transaction is no longer active');
          }
          const result = await client.query(sql, params);
          return result as T;
        },

        async commit(): Promise<void> {
          if (!isActive) {
            throw new Error('Transaction is no longer active');
          }
          await client.query('COMMIT');
          isActive = false;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        },

        async rollback(): Promise<void> {
          if (!isActive) {
            return; // Already rolled back
          }
          await client.query('ROLLBACK');
          isActive = false;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        },

        isActive(): boolean {
          return isActive;
        },

        getClient(): PoolClient {
          return client;
        },
      };

      // Execute callback
      const result = await callback(transaction);

      // Auto-commit if still active
      if (isActive) {
        await transaction.commit();
      }

      return result;
    } catch (error) {
      // Rollback on error
      if (isActive) {
        try {
          await client.query('ROLLBACK');
          isActive = false;
        } catch (rollbackError) {
          logger.error({
            error: rollbackError,
            component: 'TransactionManager',
          }, 'Error rolling back transaction');
        }
      }

      // Clear timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Log error
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'TransactionManager',
      }, 'Transaction failed');

      throw error;
    }
  }

  /**
   * Execute a simple transaction without retry or circuit breaker
   *
   * @param client - PostgreSQL client
   * @param callback - Transaction callback
   * @returns Result from callback
   */
  async executeSimple<T>(
    client: PoolClient,
    callback: (tx: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    return await this.executeTransaction(client, callback, {});
  }

  /**
   * Get transaction manager configuration
   */
  getConfig(): Required<TransactionManagerConfig> {
    return { ...this.config };
  }

  /**
   * Get retry strategy statistics
   */
  getRetryStats() {
    return this.retryStrategy?.getConfig();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker?.getState();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a transaction manager with default configuration
 */
export function createTransactionManager(
  config?: TransactionManagerConfig
): TransactionManager {
  return new TransactionManager(config);
}

/**
 * Create a transaction manager optimized for production
 */
export function createProductionTransactionManager(): TransactionManager {
  return new TransactionManager({
    enableRetry: true,
    maxRetries: 3,
    baseRetryDelay: 1000,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    circuitBreakerResetTimeout: 300000,
  });
}

/**
 * Create a transaction manager for testing (no retry, no circuit breaker)
 */
export function createTestTransactionManager(): TransactionManager {
  return new TransactionManager({
    enableRetry: false,
    maxRetries: 0,
    enableCircuitBreaker: false,
  });
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a transaction with default configuration
 *
 * @param client - PostgreSQL client
 * @param callback - Transaction callback
 * @param options - Transaction options
 * @returns Result from callback
 */
export async function withTransaction<T>(
  client: PoolClient,
  callback: (tx: DatabaseTransaction) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const manager = new TransactionManager();
  return await manager.execute(client, callback, options);
}
