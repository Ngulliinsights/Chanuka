/**
 * Database Service
 *
 * Central orchestration service for all database operations.
 * Replaces database-orchestrator.ts with a cleaner architecture using
 * the components from Phases 1-3 (strategies, connections, monitoring).
 */

import { logger } from '../../observability/core/logger';
import type { Pool, PoolClient } from 'pg';

// Phase 2: Connection components
import {
  PoolManager,
  TransactionManager,
  ConnectionRouter,
  createProductionPoolManager,
} from '../connections';

// Phase 3: Monitoring components
import {
  MetricsCollector,
  HealthChecker,
  QueryLogger,
  createProductionMetricsCollector,
  createProductionHealthChecker,
  createProductionQueryLogger,
} from '../monitoring';

// Phase 1: Strategies
import type { CircuitBreakerStrategy } from '../strategies';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DatabaseServiceConfig {
  primary: {
    connectionString: string;
    maxConnections?: number;
  };
  read?: {
    connectionStrings: string[];
    maxConnections?: number;
  };
  enableMetrics?: boolean;
  enableHealthMonitoring?: boolean;
  enableQueryLogging?: boolean;
  enableCircuitBreaker?: boolean;
  autoInitialize?: boolean;
  gracefulShutdownTimeout?: number;
}

export interface DatabaseStatus {
  initialized: boolean;
  healthy: boolean;
  connections: {
    primary: boolean;
    read: boolean;
  };
  services: {
    metrics: boolean;
    healthMonitoring: boolean;
    queryLogging: boolean;
  };
  lastHealthCheck: Date;
  uptime: number;
}

export interface DatabaseMetrics {
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    errors: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'error' | 'critical';
    lastCheck: Date;
    issues: string[];
  };
}

// ============================================================================
// Database Service Class
// ============================================================================

/**
 * DatabaseService
 *
 * Orchestrates all database components including connection management,
 * monitoring, and health checking.
 *
 * @example
 * ```typescript
 * const service = new DatabaseService({
 *   primary: {
 *     connectionString: process.env.DATABASE_URL,
 *     maxConnections: 20
 *   },
 *   enableMetrics: true,
 *   enableHealthMonitoring: true
 * });
 *
 * await service.initialize();
 * const pool = service.getPrimaryPool();
 * ```
 */
export class DatabaseService {
  private static instance: DatabaseService;

  private config: Required<DatabaseServiceConfig>;
  private initialized = false;
  private startTime: Date | null = null;

  // Phase 2: Connection components
  private primaryPoolManager: PoolManager | null = null;
  private readPoolManagers: PoolManager[] = [];
  private connectionRouter: ConnectionRouter | null = null;
  private transactionManager: TransactionManager | null = null;

  // Phase 3: Monitoring components
  private metricsCollector: MetricsCollector | null = null;
  private healthChecker: HealthChecker | null = null;
  private queryLogger: QueryLogger | null = null;

  constructor(config: DatabaseServiceConfig) {
    this.config = {
      enableMetrics: true,
      enableHealthMonitoring: true,
      enableQueryLogging: true,
      enableCircuitBreaker: true,
      autoInitialize: false,
      gracefulShutdownTimeout: 30000,
      ...config,
      primary: {
        maxConnections: 20,
        ...config.primary,
      },
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DatabaseServiceConfig): DatabaseService {
    if (!DatabaseService.instance && config) {
      DatabaseService.instance = new DatabaseService(config);
    }
    if (!DatabaseService.instance) {
      throw new Error('DatabaseService not initialized. Provide config on first call.');
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Database service already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing database service');
      this.startTime = new Date();

      // Initialize monitoring components first
      await this.initializeMonitoring();

      // Initialize connection components
      await this.initializeConnections();

      // Initialize transaction manager
      await this.initializeTransactionManager();

      this.initialized = true;
      logger.info('✅ Database service initialized successfully');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Failed to initialize database service');
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Initialize monitoring components
   */
  private async initializeMonitoring(): Promise<void> {
    logger.info('📊 Initializing monitoring components');

    if (this.config.enableMetrics) {
      this.metricsCollector = createProductionMetricsCollector('primary');
    }

    if (this.config.enableHealthMonitoring) {
      this.healthChecker = createProductionHealthChecker(
        'primary',
        this.config.primary.maxConnections
      );
    }

    if (this.config.enableQueryLogging) {
      this.queryLogger = createProductionQueryLogger('primary');
    }

    logger.info('✅ Monitoring components initialized');
  }

  /**
   * Initialize connection components
   */
  private async initializeConnections(): Promise<void> {
    logger.info('🔌 Initializing connection components');

    // Initialize primary pool
    this.primaryPoolManager = createProductionPoolManager(
      'primary',
      this.config.primary.connectionString
    );
    await this.primaryPoolManager.initialize();

    // Initialize read replicas if configured
    if (this.config.read?.connectionStrings) {
      for (let i = 0; i < this.config.read.connectionStrings.length; i++) {
        const readManager = createProductionPoolManager(
          `read-${i}`,
          this.config.read.connectionStrings[i]
        );
        await readManager.initialize();
        this.readPoolManagers.push(readManager);
      }
    }

    // Initialize connection router
    const { ConnectionRouter } = await import('../connections');
    this.connectionRouter = new ConnectionRouter({
      primary: this.primaryPoolManager.getPool(),
      read: this.readPoolManagers.map(m => m.getPool()),
    }, {
      enableReadReplicas: this.readPoolManagers.length > 0,
    });

    logger.info('✅ Connection components initialized');
  }

  /**
   * Initialize transaction manager
   */
  private async initializeTransactionManager(): Promise<void> {
    logger.info('💼 Initializing transaction manager');

    const { TransactionManager } = await import('../connections');
    this.transactionManager = new TransactionManager({
      enableRetry: true,
      maxRetries: 3,
      enableCircuitBreaker: this.config.enableCircuitBreaker,
    });

    logger.info('✅ Transaction manager initialized');
  }

  /**
   * Get primary pool
   */
  getPrimaryPool(): Pool {
    if (!this.primaryPoolManager) {
      throw new Error('Database service not initialized');
    }
    return this.primaryPoolManager.getPool();
  }

  /**
   * Get pool for operation type
   */
  getPool(operation: 'read' | 'write' | 'general' = 'general'): Pool {
    if (!this.connectionRouter) {
      throw new Error('Database service not initialized');
    }
    return this.connectionRouter.getPool(operation);
  }

  /**
   * Execute a transaction
   */
  async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: { timeout?: number }
  ): Promise<T> {
    if (!this.transactionManager || !this.primaryPoolManager) {
      throw new Error('Database service not initialized');
    }

    const pool = this.primaryPoolManager.getPool();
    const client = await pool.connect();

    try {
      const result = await this.transactionManager.execute(client, callback, options);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<DatabaseStatus> {
    const status: DatabaseStatus = {
      initialized: this.initialized,
      healthy: false,
      connections: {
        primary: false,
        read: false,
      },
      services: {
        metrics: this.metricsCollector !== null,
        healthMonitoring: this.healthChecker !== null,
        queryLogging: this.queryLogger !== null,
      },
      lastHealthCheck: new Date(),
      uptime: this.getUptime(),
    };

    if (this.healthChecker && this.primaryPoolManager) {
      try {
        const healthResult = await this.healthChecker.check(
          this.primaryPoolManager.getPool()
        );
        status.healthy = healthResult.status.isHealthy;
        status.connections.primary = healthResult.status.isHealthy;
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to get status');
      }
    }

    if (this.readPoolManagers.length > 0) {
      status.connections.read = this.readPoolManagers.every(m => m.isInitialized());
    }

    return status;
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    const metrics: DatabaseMetrics = {
      connections: {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
      },
      performance: {
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
        errors: 0,
      },
      health: {
        status: 'critical',
        lastCheck: new Date(),
        issues: [],
      },
    };

    if (this.metricsCollector && this.primaryPoolManager) {
      try {
        const collectedMetrics = this.metricsCollector.getMetrics(
          this.primaryPoolManager.getPool()
        );
        metrics.connections = {
          total: collectedMetrics.totalConnections,
          active: collectedMetrics.totalConnections - collectedMetrics.idleConnections,
          idle: collectedMetrics.idleConnections,
          waiting: collectedMetrics.waitingClients,
        };
        metrics.performance = {
          averageQueryTime: collectedMetrics.avgQueryTime ?? 0,
          slowQueries: collectedMetrics.slowQueries,
          totalQueries: collectedMetrics.queries,
          errors: collectedMetrics.errors,
        };
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to get metrics');
      }
    }

    if (this.healthChecker && this.primaryPoolManager) {
      try {
        const healthResult = await this.healthChecker.check(
          this.primaryPoolManager.getPool()
        );
        metrics.health = {
          status: healthResult.severity,
          lastCheck: new Date(),
          issues: healthResult.issues,
        };
      } catch (error) {
        metrics.health.issues.push('Failed to retrieve health metrics');
      }
    }

    return metrics;
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    let healthy = true;

    if (!this.initialized) {
      return {
        healthy: false,
        issues: ['Database service not initialized'],
      };
    }

    if (this.healthChecker && this.primaryPoolManager) {
      try {
        const result = await this.healthChecker.check(
          this.primaryPoolManager.getPool()
        );
        healthy = result.status.isHealthy;
        issues.push(...result.issues);
      } catch (error) {
        healthy = false;
        issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { healthy, issues };
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get metrics collector
   */
  getMetricsCollector(): MetricsCollector | null {
    return this.metricsCollector;
  }

  /**
   * Get health checker
   */
  getHealthChecker(): HealthChecker | null {
    return this.healthChecker;
  }

  /**
   * Get query logger
   */
  getQueryLogger(): QueryLogger | null {
    return this.queryLogger;
  }

  /**
   * Gracefully shutdown
   */
  async shutdown(timeoutMs?: number): Promise<void> {
    const timeout = timeoutMs || this.config.gracefulShutdownTimeout;

    logger.info('🛑 Shutting down database service');

    const shutdownPromises: Promise<void>[] = [];

    // Close all pool managers
    if (this.primaryPoolManager) {
      shutdownPromises.push(this.primaryPoolManager.close());
    }

    for (const readManager of this.readPoolManagers) {
      shutdownPromises.push(readManager.close());
    }

    // Wait for all shutdowns with timeout
    try {
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
        ),
      ]);

      logger.info('✅ Database service shutdown completed');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '⚠️ Database service shutdown completed with errors');
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.primaryPoolManager = null;
    this.readPoolManagers = [];
    this.connectionRouter = null;
    this.transactionManager = null;
    this.metricsCollector = null;
    this.healthChecker = null;
    this.queryLogger = null;
    this.initialized = false;
    this.startTime = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and initialize a database service
 */
export async function createDatabaseService(
  config: DatabaseServiceConfig
): Promise<DatabaseService> {
  const service = new DatabaseService(config);
  if (config.autoInitialize !== false) {
    await service.initialize();
  }
  return service;
}

/**
 * Get the singleton database service instance
 */
export function getDatabaseService(): DatabaseService {
  return DatabaseService.getInstance();
}

/**
 * Initialize the global database service
 */
export async function initializeDatabaseService(
  config: DatabaseServiceConfig
): Promise<void> {
  const service = DatabaseService.getInstance(config);
  await service.initialize();
}

/**
 * Shutdown the global database service
 */
export async function shutdownDatabaseService(): Promise<void> {
  const service = DatabaseService.getInstance();
  await service.shutdown();
}
