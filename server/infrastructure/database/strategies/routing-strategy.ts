/**
 * Routing Strategy
 *
 * Implements intelligent routing of database operations to optimal connections.
 * Supports read replica routing, load balancing, and failover.
 */

import type { Pool } from 'pg';

export interface RoutingConfig {
  readWriteRatio?: number; // Probability of using read replica (0-1)
  enableLoadBalancing?: boolean;
  enableFailover?: boolean;
  healthCheckInterval?: number;
}

export type DatabaseOperation = 'read' | 'write' | 'general';

/**
 * Pool health status for routing decisions
 */
interface PoolHealth {
  pool: Pool;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

/**
 * RoutingStrategy
 *
 * Provides intelligent routing of database operations to the optimal pool.
 * Supports read replicas, load balancing, and automatic failover.
 *
 * @example
 * ```typescript
 * const strategy = new RoutingStrategy(
 *   primaryPool,
 *   [replica1, replica2],
 *   { readWriteRatio: 0.7, enableLoadBalancing: true }
 * );
 *
 * const pool = strategy.getPoolForOperation('read');
 * const result = await pool.query('SELECT * FROM users');
 * ```
 */
export class RoutingStrategy {
  private config: Required<RoutingConfig>;
  private readPoolHealth: PoolHealth[] = [];
  private currentReadIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(
    private primaryPool: Pool,
    private readPools: Pool[] = [],
    config: RoutingConfig = {}
  ) {
    this.config = {
      readWriteRatio: config.readWriteRatio ?? 0.7,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      enableFailover: config.enableFailover ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
    };

    // Initialize health tracking for read pools
    this.readPoolHealth = readPools.map(pool => ({
      pool,
      healthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
    }));

    // Start health monitoring if enabled
    if (this.config.healthCheckInterval > 0) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Get the optimal pool for a database operation
   *
   * @param operation - Type of operation ('read', 'write', or 'general')
   * @returns The optimal pool for the operation
   */
  getPoolForOperation(operation: DatabaseOperation): Pool {
    switch (operation) {
      case 'write':
        return this.primaryPool;

      case 'read':
        return this.getReadPool();

      case 'general':
      default:
        return this.primaryPool;
    }
  }

  /**
   * Get a read pool with intelligent routing
   *
   * Uses round-robin load balancing if enabled, otherwise random selection.
   * Falls back to primary pool if no healthy read replicas are available.
   */
  private getReadPool(): Pool {
    // If no read pools configured, use primary
    if (this.readPools.length === 0) {
      return this.primaryPool;
    }

    // Check if we should use read replica based on ratio
    if (Math.random() >= this.config.readWriteRatio) {
      return this.primaryPool;
    }

    // Get healthy read pools
    const healthyPools = this.readPoolHealth.filter(ph => ph.healthy);

    // If no healthy read pools, fall back to primary
    if (healthyPools.length === 0) {
      return this.primaryPool;
    }

    // Select pool based on load balancing strategy
    if (this.config.enableLoadBalancing) {
      return this.getNextReadPoolRoundRobin(healthyPools);
    } else {
      return this.getRandomReadPool(healthyPools);
    }
  }

  /**
   * Get next read pool using round-robin load balancing
   */
  private getNextReadPoolRoundRobin(healthyPools: PoolHealth[]): Pool {
    // Find the next healthy pool in round-robin order
    let attempts = 0;
    const maxAttempts = this.readPoolHealth.length;

    while (attempts < maxAttempts) {
      this.currentReadIndex = (this.currentReadIndex + 1) % this.readPoolHealth.length;
      const poolHealth = this.readPoolHealth[this.currentReadIndex];

      if (poolHealth && poolHealth.healthy) {
        return poolHealth.pool;
      }

      attempts++;
    }

    // Fallback to first healthy pool
    return healthyPools[0]!.pool;
  }

  /**
   * Get random read pool from healthy pools
   */
  private getRandomReadPool(healthyPools: PoolHealth[]): Pool {
    const randomIndex = Math.floor(Math.random() * healthyPools.length);
    return healthyPools[randomIndex]!.pool;
  }

  /**
   * Record a successful operation on a pool
   *
   * @param pool - The pool that successfully handled an operation
   */
  recordSuccess(pool: Pool): void {
    const poolHealth = this.readPoolHealth.find(ph => ph.pool === pool);
    if (poolHealth) {
      poolHealth.healthy = true;
      poolHealth.consecutiveFailures = 0;
      poolHealth.lastCheck = Date.now();
    }
  }

  /**
   * Record a failed operation on a pool
   *
   * @param pool - The pool that failed to handle an operation
   */
  recordFailure(pool: Pool): void {
    const poolHealth = this.readPoolHealth.find(ph => ph.pool === pool);
    if (poolHealth) {
      poolHealth.consecutiveFailures++;
      poolHealth.lastCheck = Date.now();

      // Mark as unhealthy after 3 consecutive failures
      if (poolHealth.consecutiveFailures >= 3) {
        poolHealth.healthy = false;
      }
    }
  }

  /**
   * Start health monitoring for read pools
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all read pools
   */
  private async performHealthChecks(): Promise<void> {
    const healthChecks = this.readPoolHealth.map(async (poolHealth) => {
      try {
        const client = await poolHealth.pool.connect();
        await client.query('SELECT 1');
        client.release();

        // Mark as healthy
        poolHealth.healthy = true;
        poolHealth.consecutiveFailures = 0;
        poolHealth.lastCheck = Date.now();
      } catch (error) {
        // Mark as unhealthy
        poolHealth.consecutiveFailures++;
        poolHealth.lastCheck = Date.now();

        if (poolHealth.consecutiveFailures >= 3) {
          poolHealth.healthy = false;
        }
      }
    });

    await Promise.allSettled(healthChecks);
  }

  /**
   * Get health status of all pools
   */
  getHealthStatus(): {
    primary: { healthy: boolean };
    readReplicas: Array<{
      index: number;
      healthy: boolean;
      consecutiveFailures: number;
      lastCheck: Date;
    }>;
  } {
    return {
      primary: { healthy: true }, // Primary is always considered healthy
      readReplicas: this.readPoolHealth.map((ph, index) => ({
        index,
        healthy: ph.healthy,
        consecutiveFailures: ph.consecutiveFailures,
        lastCheck: new Date(ph.lastCheck),
      })),
    };
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalReadPools: number;
    healthyReadPools: number;
    unhealthyReadPools: number;
    currentReadIndex: number;
    readWriteRatio: number;
  } {
    const healthyCount = this.readPoolHealth.filter(ph => ph.healthy).length;

    return {
      totalReadPools: this.readPools.length,
      healthyReadPools: healthyCount,
      unhealthyReadPools: this.readPools.length - healthyCount,
      currentReadIndex: this.currentReadIndex,
      readWriteRatio: this.config.readWriteRatio,
    };
  }

  /**
   * Manually mark a pool as healthy or unhealthy
   *
   * @param pool - The pool to update
   * @param healthy - Whether the pool is healthy
   */
  setPoolHealth(pool: Pool, healthy: boolean): void {
    const poolHealth = this.readPoolHealth.find(ph => ph.pool === pool);
    if (poolHealth) {
      poolHealth.healthy = healthy;
      poolHealth.consecutiveFailures = healthy ? 0 : poolHealth.consecutiveFailures;
      poolHealth.lastCheck = Date.now();
    }
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): Required<RoutingConfig> {
    return { ...this.config };
  }
}

/**
 * Create a routing strategy with default configuration
 */
export function createDefaultRoutingStrategy(
  primaryPool: Pool,
  readPools: Pool[] = []
): RoutingStrategy {
  return new RoutingStrategy(primaryPool, readPools, {
    readWriteRatio: 0.7,
    enableLoadBalancing: true,
    enableFailover: true,
    healthCheckInterval: 30000,
  });
}

/**
 * Create a routing strategy optimized for production
 */
export function createProductionRoutingStrategy(
  primaryPool: Pool,
  readPools: Pool[]
): RoutingStrategy {
  return new RoutingStrategy(primaryPool, readPools, {
    readWriteRatio: 0.8, // Favor read replicas more in production
    enableLoadBalancing: true,
    enableFailover: true,
    healthCheckInterval: 15000, // More frequent health checks
  });
}

/**
 * Create a routing strategy for testing (no read replicas)
 */
export function createTestRoutingStrategy(primaryPool: Pool): RoutingStrategy {
  return new RoutingStrategy(primaryPool, [], {
    readWriteRatio: 0,
    enableLoadBalancing: false,
    enableFailover: false,
    healthCheckInterval: 0,
  });
}
