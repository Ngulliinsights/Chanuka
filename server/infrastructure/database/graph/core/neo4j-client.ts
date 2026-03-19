
import { Driver, QueryResult } from 'neo4j-driver';

import { logger } from '../../../observability';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';


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
  async executeRead(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<QueryResult> {
    return this.execute(cypher, params, 'READ');
  }

  /**
   * Execute a write query with automatic session management and retry.
   */
  async executeWrite(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<QueryResult> {
    return this.execute(cypher, params, 'WRITE');
  }

  /**
   * Execute a query with automatic session management.
   */
  private async execute(
    cypher: string,
    params: Record<string, unknown>,
    mode: 'READ' | 'WRITE'
  ): Promise<QueryResult> {
    const session = this.driver.session({
      defaultAccessMode: mode === 'READ' ? 'READ' : 'WRITE',
      ...(this.config.defaultDatabase ? { database: this.config.defaultDatabase } : {}),
    });

    try {
      if (this.config.logQueries) {
        logger.debug({
          cypher: cypher.substring(0, 100),
          mode,
          params: Object.keys(params)
        }, 'Executing query');
      }

      const executeQuery = async () => {
        return await session.run(cypher, params);
      };

      if (mode === 'WRITE') {
        return await retryWithBackoff(executeQuery, {
          ...RETRY_PRESETS.DATABASE_OPERATION,
          ...(this.config.maxRetries !== undefined && { maxRetries: this.config.maxRetries }),
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
    operations: (tx: any) => Promise<T>
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
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Health check failed');
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

      const nodeRecord = nodeResult.records[0];
      const relRecord = relResult.records[0];

      return {
        nodeCount: nodeRecord ? Number(nodeRecord.get('count')) : 0,
        relationshipCount: relRecord ? Number(relRecord.get('count')) : 0,
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get stats');
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
