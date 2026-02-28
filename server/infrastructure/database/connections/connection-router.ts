/**
 * Connection Router
 *
 * Routes database operations to optimal connections based on operation type.
 * Extracted from connection.ts to provide focused routing functionality.
 */

import type { Pool, PoolClient } from 'pg';

import { logger } from '../../observability/core/logger';
import { RoutingStrategy, type DatabaseOperation } from '../strategies';
import type { EnhancedPool } from './pool-manager';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ConnectionRouterConfig {
  enableReadReplicas?: boolean;
  readWriteRatio?: number;
  enableLoadBalancing?: boolean;
  enableFailover?: boolean;
  healthCheckInterval?: number;
}

/**
 * Connection collection for routing
 */
export interface ConnectionPools {
  primary: EnhancedPool;
  read?: EnhancedPool[];
  operational?: EnhancedPool;
  analytics?: EnhancedPool;
  security?: EnhancedPool;
}

// ============================================================================
// Connection Router Class
// ============================================================================

/**
 * ConnectionRouter
 *
 * Routes database operations to the optimal connection pool based on
 * operation type, load balancing, and health status.
 *
 * @example
 * ```typescript
 * const router = new ConnectionRouter({
 *   primary: primaryPool,
 *   read: [replica1, replica2]
 * }, {
 *   enableReadReplicas: true,
 *   readWriteRatio: 0.7
 * });
 *
 * const pool = router.getPool('read');
 * const result = await pool.query('SELECT * FROM users');
 * ```
 */
export class ConnectionRouter {
  private config: Required<ConnectionRouterConfig>;
  private pools: ConnectionPools;
  private routingStrategy: RoutingStrategy;

  constructor(pools: ConnectionPools, config: ConnectionRouterConfig = {}) {
    this.pools = pools;
    this.config = {
      enableReadReplicas: config.enableReadReplicas ?? true,
      readWriteRatio: config.readWriteRatio ?? 0.7,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      enableFailover: config.enableFailover ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
    };

    // Initialize routing strategy
    this.routingStrategy = new RoutingStrategy(
      pools.primary as Pool,
      (pools.read || []) as Pool[],
      {
        readWriteRatio: this.config.readWriteRatio,
        enableLoadBalancing: this.config.enableLoadBalancing,
        enableFailover: this.config.enableFailover,
        healthCheckInterval: this.config.healthCheckInterval,
      }
    );

    logger.info({
      component: 'ConnectionRouter',
      primaryPool: true,
      readReplicas: pools.read?.length || 0,
      specializedPools: {
        operational: !!pools.operational,
        analytics: !!pools.analytics,
        security: !!pools.security,
      },
    }, 'Connection router initialized');
  }

  /**
   * Get a pool for a specific operation type
   *
   * @param operation - Type of operation ('read', 'write', or 'general')
   * @returns The optimal pool for the operation
   */
  getPool(operation: DatabaseOperation = 'general'): EnhancedPool {
    if (!this.config.enableReadReplicas || operation === 'write') {
      return this.pools.primary;
    }

    const pool = this.routingStrategy.getPoolForOperation(operation);
    return pool as EnhancedPool;
  }

  /**
   * Get a client connection for a specific operation
   *
   * @param operation - Type of operation
   * @returns A connected client
   */
  async getClient(operation: DatabaseOperation = 'general'): Promise<PoolClient> {
    const pool = this.getPool(operation);
    
    try {
      const client = await pool.connect();
      
      // Record success for routing strategy
      this.routingStrategy.recordSuccess(pool as Pool);
      
      return client;
    } catch (error) {
      // Record failure for routing strategy
      this.routingStrategy.recordFailure(pool as Pool);
      
      logger.error({
        component: 'ConnectionRouter',
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get client connection');
      
      throw error;
    }
  }

  /**
   * Get specialized database pool
   *
   * @param database - Database type ('operational', 'analytics', or 'security')
   * @returns The specialized pool or primary as fallback
   */
  getSpecializedPool(database: 'operational' | 'analytics' | 'security'): EnhancedPool {
    switch (database) {
      case 'operational':
        return this.pools.operational || this.pools.primary;
      case 'analytics':
        return this.pools.analytics || this.pools.primary;
      case 'security':
        return this.pools.security || this.pools.primary;
      default:
        return this.pools.primary;
    }
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      routing: this.routingStrategy.getStats(),
      health: this.routingStrategy.getHealthStatus(),
      config: this.config,
    };
  }

  /**
   * Get health status of all pools
   */
  async getHealthStatus() {
    const health = {
      primary: await this.checkPoolHealth(this.pools.primary),
      readReplicas: await Promise.all(
        (this.pools.read || []).map(pool => this.checkPoolHealth(pool))
      ),
      specialized: {
        operational: this.pools.operational
          ? await this.checkPoolHealth(this.pools.operational)
          : null,
        analytics: this.pools.analytics
          ? await this.checkPoolHealth(this.pools.analytics)
          : null,
        security: this.pools.security
          ? await this.checkPoolHealth(this.pools.security)
          : null,
      },
    };

    return health;
  }

  /**
   * Check health of a single pool
   */
  private async checkPoolHealth(pool: EnhancedPool): Promise<{
    healthy: boolean;
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  }> {
    try {
      const health = await pool.getHealth();
      return {
        healthy: health.isHealthy,
        totalConnections: health.totalConnections,
        idleConnections: health.idleConnections,
        waitingClients: health.waitingClients,
      };
    } catch (error) {
      return {
        healthy: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
      };
    }
  }

  /**
   * Update routing configuration
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<ConnectionRouterConfig>): void {
    this.config = { ...this.config, ...config };

    // Update routing strategy if needed
    if (config.readWriteRatio !== undefined ||
        config.enableLoadBalancing !== undefined ||
        config.enableFailover !== undefined ||
        config.healthCheckInterval !== undefined) {
      
      // Stop old strategy
      this.routingStrategy.stop();

      // Create new strategy with updated config
      this.routingStrategy = new RoutingStrategy(
        this.pools.primary as Pool,
        (this.pools.read || []) as Pool[],
        {
          readWriteRatio: this.config.readWriteRatio,
          enableLoadBalancing: this.config.enableLoadBalancing,
          enableFailover: this.config.enableFailover,
          healthCheckInterval: this.config.healthCheckInterval,
        }
      );
    }
  }

  /**
   * Stop the connection router
   */
  stop(): void {
    this.routingStrategy.stop();
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ConnectionRouterConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a connection router with default configuration
 */
export function createConnectionRouter(
  pools: ConnectionPools,
  config?: ConnectionRouterConfig
): ConnectionRouter {
  return new ConnectionRouter(pools, config);
}

/**
 * Create a connection router optimized for production
 */
export function createProductionConnectionRouter(
  pools: ConnectionPools
): ConnectionRouter {
  return new ConnectionRouter(pools, {
    enableReadReplicas: true,
    readWriteRatio: 0.8, // Favor read replicas in production
    enableLoadBalancing: true,
    enableFailover: true,
    healthCheckInterval: 15000, // More frequent health checks
  });
}

/**
 * Create a connection router for testing (no read replicas)
 */
export function createTestConnectionRouter(
  primaryPool: EnhancedPool
): ConnectionRouter {
  return new ConnectionRouter(
    { primary: primaryPool },
    {
      enableReadReplicas: false,
      readWriteRatio: 0,
      enableLoadBalancing: false,
      enableFailover: false,
      healthCheckInterval: 0,
    }
  );
}
