/**
 * Database Orchestrator
 *
 * Central coordination point for all database operations across the Chanuka platform.
 * This orchestrator unifies connection management, migrations, health monitoring,
 * and operational tasks into a single, cohesive interface.
 */

import { logger } from '../../core/src';
import { UnifiedConnectionManager } from './connection-manager';
import { UnifiedHealthMonitor } from './health-monitor';
import { DatabaseConfigManager } from './unified-config';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DatabaseOrchestrationConfig {
  autoInitialize?: boolean;
  enableHealthMonitoring?: boolean;
  enableMigrations?: boolean;
  enableBackups?: boolean;
  gracefulShutdownTimeout?: number;
}

export interface DatabaseStatus {
  initialized: boolean;
  healthy: boolean;
  connections: {
    primary: boolean;
    replicas: boolean;
    analytics: boolean;
    security: boolean;
  };
  services: {
    healthMonitor: boolean;
    migrations: boolean;
    backups: boolean;
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
    errorRate: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    issues: string[];
  };
}

// ============================================================================
// Database Orchestrator Class
// ============================================================================

export class DatabaseOrchestrator {
  private static instance: DatabaseOrchestrator;

  private connectionManager: UnifiedConnectionManager | null = null;
  private healthMonitor: UnifiedHealthMonitor | null = null;
  private configManager: DatabaseConfigManager;

  private initialized = false;
  private startTime: Date | null = null;
  private shutdownPromise: Promise<void> | null = null;

  private config: DatabaseOrchestrationConfig = {
    autoInitialize: true,
    enableHealthMonitoring: true,
    enableMigrations: true,
    enableBackups: false,
    gracefulShutdownTimeout: 30000,
  };

  constructor(config?: Partial<DatabaseOrchestrationConfig>) {
    this.config = { ...this.config, ...config };
    this.configManager = DatabaseConfigManager.getInstance();
  }

  /**
   * Get singleton instance of the database orchestrator
   */
  static getInstance(config?: Partial<DatabaseOrchestrationConfig>): DatabaseOrchestrator {
    if (!DatabaseOrchestrator.instance) {
      DatabaseOrchestrator.instance = new DatabaseOrchestrator(config);
    }
    return DatabaseOrchestrator.instance;
  }

  /**
   * Initialize all database services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Database orchestrator already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing database orchestrator');
      this.startTime = new Date();

      // Initialize configuration if not already done
      if (!this.configManager['config']) {
        logger.info('📋 Loading database configuration from environment');
        this.configManager.loadFromEnvironment();
      }

      // Initialize connection manager
      await this.initializeConnectionManager();

      // Initialize health monitoring
      if (this.config.enableHealthMonitoring) {
        await this.initializeHealthMonitoring();
      }

      // Initialize migrations (if enabled and in appropriate environment)
      if (this.config.enableMigrations) {
        await this.initializeMigrations();
      }

      this.initialized = true;
      logger.info('✅ Database orchestrator initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize database orchestrator', { error });
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Gracefully shutdown all database services
   */
  async shutdown(timeoutMs?: number): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    const timeout = timeoutMs || this.config.gracefulShutdownTimeout!;

    this.shutdownPromise = this.performShutdown(timeout);
    return this.shutdownPromise;
  }

  /**
   * Get the connection manager instance
   */
  getConnectionManager(): UnifiedConnectionManager {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized. Call initialize() first.');
    }
    return this.connectionManager;
  }

  /**
   * Get the health monitor instance
   */
  getHealthMonitor(): UnifiedHealthMonitor | null {
    return this.healthMonitor;
  }

  /**
   * Get current database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    const status: DatabaseStatus = {
      initialized: this.initialized,
      healthy: false,
      connections: {
        primary: false,
        replicas: false,
        analytics: false,
        security: false,
      },
      services: {
        healthMonitor: this.healthMonitor !== null,
        migrations: this.config.enableMigrations || false,
        backups: this.config.enableBackups || false,
      },
      lastHealthCheck: new Date(),
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    };

    if (this.connectionManager) {
      try {
        const healthStatus = await this.connectionManager.checkDatabaseHealth();
        status.healthy = healthStatus.overall;
        status.connections.primary = healthStatus.operational;
        status.connections.replicas = healthStatus.analytics; // Using analytics as replica indicator
        status.connections.analytics = healthStatus.analytics;
        status.connections.security = healthStatus.security;
      } catch (error) {
        logger.error('Failed to get connection status', { error });
      }
    }

    return status;
  }

  /**
   * Get current database metrics
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
        errorRate: 0,
      },
      health: {
        status: 'unhealthy',
        lastCheck: new Date(),
        issues: [],
      },
    };

    if (this.connectionManager) {
      try {
        const connectionMetrics = this.connectionManager.getMetrics();
        metrics.connections = {
          total: connectionMetrics.totalConnections,
          active: connectionMetrics.activeConnections,
          idle: connectionMetrics.idleConnections,
          waiting: connectionMetrics.waitingClients,
        };
        metrics.performance.averageQueryTime = connectionMetrics.averageQueryTime;
        metrics.performance.errorRate = connectionMetrics.errorCount / Math.max(connectionMetrics.totalQueries, 1);
      } catch (error) {
        logger.error('Failed to get connection metrics', { error });
        metrics.health.issues.push('Failed to retrieve connection metrics');
      }
    }

    if (this.healthMonitor) {
      try {
        const healthSummary = this.healthMonitor.getHealthSummary();
        metrics.health.status = healthSummary.status as 'healthy' | 'degraded' | 'unhealthy';
        metrics.health.lastCheck = new Date(healthSummary.lastCheck);
      } catch (error) {
        logger.error('Failed to get health metrics', { error });
        metrics.health.issues.push('Failed to retrieve health metrics');
      }
    }

    return metrics;
  }

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    let healthy = true;

    try {
      // Check connection manager
      if (this.connectionManager) {
        const healthStatus = await this.connectionManager.checkDatabaseHealth();
        if (!healthStatus.overall) {
          healthy = false;
          issues.push('Database connections are unhealthy');
        }
      } else {
        healthy = false;
        issues.push('Connection manager not initialized');
      }

      // Check health monitor
      if (this.healthMonitor && this.config.enableHealthMonitoring) {
        const isRunning = this.healthMonitor.isRunning();
        if (!isRunning) {
          issues.push('Health monitor is not running');
        }
      }

      // Additional health checks can be added here

    } catch (error) {
      healthy = false;
      issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Health check failed', { error });
    }

    return { healthy, issues };
  }

  /**
   * Check if the orchestrator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize the connection manager
   */
  private async initializeConnectionManager(): Promise<void> {
    logger.info('🔌 Initializing connection manager');

    const connectionConfig = this.configManager.getConnectionConfig();

    // Import and create connection manager
    const { createConnectionManager } = await import('./connection-manager');
    this.connectionManager = await createConnectionManager(connectionConfig);

    if (this.connectionManager) {
      await this.connectionManager.initialize();
    }

    logger.info('✅ Connection manager initialized');
  }

  /**
   * Initialize health monitoring
   */
  private async initializeHealthMonitoring(): Promise<void> {
    if (!this.connectionManager) {
      throw new Error('Connection manager must be initialized before health monitoring');
    }

    logger.info('🏥 Initializing health monitoring');

    const monitoringConfig = this.configManager.getMonitoringConfig();

    if (!monitoringConfig.enabled) {
      logger.info('Health monitoring disabled by configuration');
      return;
    }

    // Import and create health monitor
    const { createHealthMonitor } = await import('./health-monitor');
    this.healthMonitor = createHealthMonitor(this.connectionManager, monitoringConfig);

    this.healthMonitor.start();

    logger.info('✅ Health monitoring initialized');
  }

  /**
   * Initialize migrations (placeholder for future implementation)
   */
  private async initializeMigrations(): Promise<void> {
    logger.info('📦 Migration system ready (implementation pending)');
    // TODO: Implement migration initialization when migration service is moved to shared
  }

  /**
   * Perform the actual shutdown process
   */
  private async performShutdown(timeoutMs: number): Promise<void> {
    logger.info('🛑 Shutting down database orchestrator');

    const shutdownPromises: Promise<void>[] = [];

    // Stop health monitoring
    if (this.healthMonitor) {
      logger.info('Stopping health monitor');
      shutdownPromises.push(
        Promise.resolve(this.healthMonitor.stop()).catch(error => {
          logger.error('Error stopping health monitor', { error });
        })
      );
    }

    // Close connection manager
    if (this.connectionManager) {
      logger.info('Closing connection manager');
      shutdownPromises.push(
        this.connectionManager.close().catch(error => {
          logger.error('Error closing connection manager', { error });
        })
      );
    }

    // Wait for all shutdowns with timeout
    try {
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)
        ),
      ]);

      logger.info('✅ Database orchestrator shutdown completed');
    } catch (error) {
      logger.error('⚠️ Database orchestrator shutdown completed with errors', { error });
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.connectionManager = null;
    this.healthMonitor = null;
    this.initialized = false;
    this.startTime = null;
    this.shutdownPromise = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create and initialize a database orchestrator
 */
export async function createDatabaseOrchestrator(
  config?: Partial<DatabaseOrchestrationConfig>
): Promise<DatabaseOrchestrator> {
  const orchestrator = new DatabaseOrchestrator(config);
  await orchestrator.initialize();
  return orchestrator;
}

/**
 * Get the singleton database orchestrator instance
 */
export function getDatabaseOrchestrator(): DatabaseOrchestrator {
  return DatabaseOrchestrator.getInstance();
}

/**
 * Initialize the global database orchestrator
 */
export async function initializeDatabaseOrchestrator(
  config?: Partial<DatabaseOrchestrationConfig>
): Promise<void> {
  const orchestrator = DatabaseOrchestrator.getInstance(config);
  await orchestrator.initialize();
}

/**
 * Shutdown the global database orchestrator
 */
export async function shutdownDatabaseOrchestrator(): Promise<void> {
  const orchestrator = DatabaseOrchestrator.getInstance();
  await orchestrator.shutdown();
}


