/**
 * Neo4j Client Wrapper (REFACTORED)
 * 
 * High-level Neo4j client with automatic session management,
 * connection pooling, and error handling.
 * 
 * IMPROVEMENTS:
 * - ✅ Automatic session cleanup
 * - ✅ Connection pooling
 * - ✅ Retry logic built-in
 * - ✅ Comprehensive error handling
 * - ✅ Transaction support
 */

import { Driver, Session, Transaction, Result, SessionConfig } from 'neo4j-driver';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from './retry-utils';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export interface Neo4jClientConfig {
  defaultDatabase?: string;
  maxRetries?: number;
  logQueries?: boolean;
}

export class Neo4jClient {
  private driver: Driver;
  private config: Neo4jClientConfig;

  constructor(driver: Driver, config: Neo4jClientConfig = {}) {
    this.driver = driver;
    this.config = {
      maxRetries: 3,
      logQueries: false,
      ...config,
    };
  }

  /**
   * Execute a read query with automatic session management.
   */
  async executeRead<T = any>(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<Result<T>> {
    return this.execute(cypher, params, 'READ');
  }

  /**
   * Execute a write query with automatic session management and retry.
   */
  async executeWrite<T = any>(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<Result<T>> {
    return this.execute(cypher, params, 'WRITE');
  }

  /**
   * Execute a query with automatic session management.
   */
  private async execute<T = any>(
    cypher: string,
    params: Record<string, unknown>,
    mode: 'READ' | 'WRITE'
  ): Promise<Result<T>> {
    const sessionConfig: SessionConfig = {
      defaultAccessMode: mode === 'READ' ? 'READ' : 'WRITE',
    };

    if (this.config.defaultDatabase) {
      sessionConfig.database = this.config.defaultDatabase;
    }

    const session = this.driver.session(sessionConfig);

    try {
      if (this.config.logQueries) {
        logger.debug('Executing query', { 
          cypher: cypher.substring(0, 100),
          mode,
          params: Object.keys(params)
        });
      }

      const executeQuery = async () => {
        return await session.run<T>(cypher, params);
      };

      if (mode === 'WRITE') {
        return await retryWithBackoff(executeQuery, {
          ...RETRY_PRESETS.DATABASE_OPERATION,
          maxRetries: this.config.maxRetries,
        });
      } else {
        return await executeQuery();
      }
    } catch (error) {
      errorHandler.handle(error as Error, {
        operation: 'executeQuery',
        cypher: cypher.substring(0, 100),
        mode,
      });

      throw new GraphError({
        code: mode === 'READ' ? GraphErrorCode.QUERY_FAILED : GraphErrorCode.SYNC_FAILED,
        message: `Query execution failed (${mode})`,
        cause: error as Error,
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple operations in a transaction.
   */
  async executeTransaction<T>(
    operations: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const session = this.driver.session();
    const tx = session.beginTransaction();

    try {
      const result = await operations(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      
      errorHandler.handle(error as Error, {
        operation: 'executeTransaction',
      });

      throw new GraphError({
        code: GraphErrorCode.TRANSACTION_FAILED,
        message: 'Transaction execution failed',
        cause: error as Error,
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Check connection health.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeRead('RETURN 1 as health');
      return result.records.length > 0;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get database statistics.
   */
  async getStats(): Promise<{ nodeCount: number; relationshipCount: number }> {
    try {
      const nodeResult = await this.executeRead('MATCH (n) RETURN count(n) as count');
      const relResult = await this.executeRead('MATCH ()-[r]->() RETURN count(r) as count');

      return {
        nodeCount: Number(nodeResult.records[0]?.get('count')) || 0,
        relationshipCount: Number(relResult.records[0]?.get('count')) || 0,
      };
    } catch (error) {
      logger.error('Failed to get stats', { error: error.message });
      return { nodeCount: 0, relationshipCount: 0 };
    }
  }

  /**
   * Close the driver connection.
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
}

/**
 * Factory function to create Neo4j client.
 */
export function createNeo4jClient(
  driver: Driver,
  config?: Neo4jClientConfig
): Neo4jClient {
  return new Neo4jClient(driver, config);
}

export default Neo4jClient;
