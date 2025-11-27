/**
 * Database Integration Service
 * 
 * Main orchestrator for all database operations:
 * - Connection pool management
 * - Migration execution
 * - Performance monitoring
 * - Backup and recovery
 * - Data validation
 * - Health checks
 */

import { Pool } from 'pg';
import { logger } from '@shared/core/index.js';
import { 
  DatabaseConnectionPool, 
  createConnectionPool, 
  ConnectionPoolConfig 
} from './connection-pool.js';
import { 
  DatabaseMigrationManager, 
  createMigrationManager 
} from './migration-manager.js';
import { 
  DatabaseIndexingOptimizer, 
  createIndexOptimizer 
} from './indexing-optimizer.js';
import { 
  DatabaseBackupRecovery, 
  createBackupRecovery, 
  BackupConfig 
} from './backup-recovery.js';
import { 
  DatabaseMonitoring, 
  createDatabaseMonitoring 
} from './monitoring.js';
import { 
  DatabaseValidation, 
  createDatabaseValidation 
} from './validation.js';

export interface DatabaseIntegrationConfig {
  connectionPool: ConnectionPoolConfig;
  backup: BackupConfig;
  monitoring: {
    enabled: boolean;
    intervalMs: number;
  };
  validation: {
    enabled: boolean;
    scheduleHours: number[];
  };
  indexOptimization: {
    enabled: boolean;
    scheduleHours: number[];
  };
}

export interface DatabaseHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    connection: ComponentHealth;
    migrations: ComponentHealth;
    performance: ComponentHealth;
    backup: ComponentHealth;
    validation: ComponentHealth;
  };
  lastCheck: Date;
  recommendations: string[];
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: Date;
  metrics?: any;
}

export class DatabaseIntegrationService {
  private connectionPool: DatabaseConnectionPool;
  private migrationManager: DatabaseMigrationManager;
  private indexOptimizer: DatabaseIndexingOptimizer;
  private backupRecovery: DatabaseBackupRecovery;
  private monitoring: DatabaseMonitoring;
  private validation: DatabaseValidation;
  private config: DatabaseIntegrationConfig;
  private scheduledTasks: NodeJS.Timeout[] = [];

  constructor(config: DatabaseIntegrationConfig) {
    this.config = config;
    
    // Initialize connection pool
    this.connectionPool = createConnectionPool(config.connectionPool);
    
    // Get the underlying pool for other services
    const pool = this.connectionPool['primaryPool'] as Pool;
    
    // Initialize all database services
    this.migrationManager = createMigrationManager(pool);
    this.indexOptimizer = createIndexOptimizer(pool);
    this.backupRecovery = createBackupRecovery(pool, config.backup);
    this.monitoring = createDatabaseMonitoring(pool);
    this.validation = createDatabaseValidation(pool);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the database integration service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing database integration service', {
      component: 'DatabaseIntegration'
    });

    try {
      // Initialize migration tracking
      await this.migrationManager.initializeMigrationTracking();

      // Run pending migrations
      const migrationResults = await this.migrationManager.runMigrations();
      if (migrationResults.length > 0) {
        logger.info(`Applied ${migrationResults.length} database migrations`, {
          component: 'DatabaseIntegration'
        });
      }

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.monitoring.startMonitoring(this.config.monitoring.intervalMs);
      }

      // Schedule validation if enabled
      if (this.config.validation.enabled) {
        this.scheduleValidation();
      }

      // Schedule index optimization if enabled
      if (this.config.indexOptimization.enabled) {
        this.scheduleIndexOptimization();
      }

      logger.info('Database integration service initialized successfully', {
        component: 'DatabaseIntegration'
      });

    } catch (error) {
      logger.error('Failed to initialize database integration service', {
        component: 'DatabaseIntegration',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Shutdown the database integration service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database integration service', {
      component: 'DatabaseIntegration'
    });

    try {
      // Clear scheduled tasks
      this.scheduledTasks.forEach(task => clearTimeout(task));
      this.scheduledTasks = [];

      // Stop monitoring
      this.monitoring.stopMonitoring();

      // Close connection pool
      await this.connectionPool.close();

      logger.info('Database integration service shut down successfully', {
        component: 'DatabaseIntegration'
      });

    } catch (error) {
      logger.error('Error during database integration service shutdown', {
        component: 'DatabaseIntegration',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get comprehensive database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    const lastCheck = new Date();
    const components: DatabaseHealthStatus['components'] = {
      connection: await this.checkConnectionHealth(),
      migrations: await this.checkMigrationHealth(),
      performance: await this.checkPerformanceHealth(),
      backup: await this.checkBackupHealth(),
      validation: await this.checkValidationHealth()
    };

    // Determine overall health
    const componentStatuses = Object.values(components).map(c => c.status);
    let overall: 'healthy' | 'warning' | 'critical';

    if (componentStatuses.includes('critical')) {
      overall = 'critical';
    } else if (componentStatuses.includes('warning')) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(components);

    return {
      overall,
      components,
      lastCheck,
      recommendations
    };
  }

  /**
   * Check connection health
   */
  private async checkConnectionHealth(): Promise<ComponentHealth> {
    try {
      const metrics = this.connectionPool.getMetrics();
      const poolStatus = this.connectionPool.getPoolStatus();

      if (metrics.errorCount > 10) {
        return {
          status: 'critical',
          message: `High error count: ${metrics.errorCount} errors`,
          lastCheck: new Date(),
          metrics
        };
      }

      if (metrics.utilizationPercent > 90) {
        return {
          status: 'warning',
          message: `High connection utilization: ${metrics.utilizationPercent.toFixed(1)}%`,
          lastCheck: new Date(),
          metrics
        };
      }

      return {
        status: 'healthy',
        message: `Connection pool healthy (${metrics.activeConnections}/${metrics.totalConnections} active)`,
        lastCheck: new Date(),
        metrics
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Connection check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Check migration health
   */
  private async checkMigrationHealth(): Promise<ComponentHealth> {
    try {
      const status = await this.migrationManager.getMigrationStatus();
      const validation = await this.migrationManager.validateMigrations();

      if (!validation.valid) {
        return {
          status: 'critical',
          message: `Migration validation failed: ${validation.issues.join(', ')}`,
          lastCheck: new Date(),
          metrics: { status, validation }
        };
      }

      if (status.pendingMigrations.length > 0) {
        return {
          status: 'warning',
          message: `${status.pendingMigrations.length} pending migrations`,
          lastCheck: new Date(),
          metrics: status
        };
      }

      return {
        status: 'healthy',
        message: `All migrations applied (current: ${status.currentVersion})`,
        lastCheck: new Date(),
        metrics: status
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Migration check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Check performance health
   */
  private async checkPerformanceHealth(): Promise<ComponentHealth> {
    try {
      const metrics = this.monitoring.getCurrentMetrics();

      if (!metrics) {
        return {
          status: 'warning',
          message: 'No performance metrics available',
          lastCheck: new Date()
        };
      }

      const activeAlerts = this.monitoring.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

      if (criticalAlerts.length > 0) {
        return {
          status: 'critical',
          message: `${criticalAlerts.length} critical performance alerts`,
          lastCheck: new Date(),
          metrics
        };
      }

      if (activeAlerts.length > 0) {
        return {
          status: 'warning',
          message: `${activeAlerts.length} performance alerts`,
          lastCheck: new Date(),
          metrics
        };
      }

      return {
        status: 'healthy',
        message: 'Performance metrics within normal ranges',
        lastCheck: new Date(),
        metrics
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Performance check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Check backup health
   */
  private async checkBackupHealth(): Promise<ComponentHealth> {
    try {
      const backups = await this.backupRecovery.listBackups();
      const recentBackups = backups.filter(b => 
        Date.now() - b.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (recentBackups.length === 0) {
        return {
          status: 'critical',
          message: 'No recent backups found (last 24 hours)',
          lastCheck: new Date(),
          metrics: { totalBackups: backups.length, recentBackups: recentBackups.length }
        };
      }

      const failedBackups = recentBackups.filter(b => b.status === 'failed');
      if (failedBackups.length > 0) {
        return {
          status: 'warning',
          message: `${failedBackups.length} failed backups in last 24 hours`,
          lastCheck: new Date(),
          metrics: { totalBackups: backups.length, recentBackups: recentBackups.length, failedBackups: failedBackups.length }
        };
      }

      return {
        status: 'healthy',
        message: `${recentBackups.length} successful backups in last 24 hours`,
        lastCheck: new Date(),
        metrics: { totalBackups: backups.length, recentBackups: recentBackups.length }
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Backup check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Check validation health
   */
  private async checkValidationHealth(): Promise<ComponentHealth> {
    try {
      // Run a quick validation check
      const report = await this.validation.runValidation();

      if (report.criticalViolations > 0) {
        return {
          status: 'critical',
          message: `${report.criticalViolations} critical data validation violations`,
          lastCheck: new Date(),
          metrics: report
        };
      }

      if (report.overallScore < 90) {
        return {
          status: 'warning',
          message: `Data quality score: ${report.overallScore.toFixed(1)}%`,
          lastCheck: new Date(),
          metrics: report
        };
      }

      return {
        status: 'healthy',
        message: `Data quality excellent: ${report.overallScore.toFixed(1)}%`,
        lastCheck: new Date(),
        metrics: report
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Validation check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(components: DatabaseHealthStatus['components']): string[] {
    const recommendations: string[] = [];

    if (components.connection.status === 'critical') {
      recommendations.push('URGENT: Fix database connection issues immediately');
    } else if (components.connection.status === 'warning') {
      recommendations.push('Consider increasing connection pool size or optimizing connection usage');
    }

    if (components.migrations.status === 'critical') {
      recommendations.push('URGENT: Resolve migration validation issues before proceeding');
    } else if (components.migrations.status === 'warning') {
      recommendations.push('Apply pending database migrations');
    }

    if (components.performance.status === 'critical') {
      recommendations.push('URGENT: Address critical performance alerts');
    } else if (components.performance.status === 'warning') {
      recommendations.push('Review and resolve performance alerts');
    }

    if (components.backup.status === 'critical') {
      recommendations.push('URGENT: Ensure database backups are running successfully');
    } else if (components.backup.status === 'warning') {
      recommendations.push('Investigate recent backup failures');
    }

    if (components.validation.status === 'critical') {
      recommendations.push('URGENT: Fix critical data integrity violations');
    } else if (components.validation.status === 'warning') {
      recommendations.push('Improve data quality by addressing validation issues');
    }

    if (recommendations.length === 0) {
      recommendations.push('Database is healthy - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Monitor database alerts
    this.monitoring.on('alert', (alert) => {
      logger.warn('Database alert triggered', {
        component: 'DatabaseIntegration',
        alert: {
          id: alert.id,
          severity: alert.severity,
          message: alert.message
        }
      });
    });

    // Monitor alert resolutions
    this.monitoring.on('alertResolved', (alert) => {
      logger.info('Database alert resolved', {
        component: 'DatabaseIntegration',
        alert: {
          id: alert.id,
          message: alert.message
        }
      });
    });
  }

  /**
   * Schedule validation runs
   */
  private scheduleValidation(): void {
    const scheduleNext = () => {
      const now = new Date();
      const nextHour = this.config.validation.scheduleHours.find(hour => hour > now.getHours()) 
        || this.config.validation.scheduleHours[0];
      
      const nextRun = new Date();
      if (nextHour <= now.getHours()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      nextRun.setHours(nextHour, 0, 0, 0);

      const delay = nextRun.getTime() - now.getTime();

      const timeout = setTimeout(async () => {
        try {
          logger.info('Running scheduled database validation', {
            component: 'DatabaseIntegration'
          });

          const report = await this.validation.runValidation();
          
          if (report.criticalViolations > 0) {
            logger.error(`Database validation found ${report.criticalViolations} critical violations`, {
              component: 'DatabaseIntegration',
              score: report.overallScore
            });
          } else {
            logger.info(`Database validation completed successfully`, {
              component: 'DatabaseIntegration',
              score: report.overallScore,
              failedRules: report.failedRules
            });
          }

        } catch (error) {
          logger.error('Scheduled database validation failed', {
            component: 'DatabaseIntegration',
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // Schedule next run
        scheduleNext();
      }, delay);

      this.scheduledTasks.push(timeout);
    };

    scheduleNext();
  }

  /**
   * Schedule index optimization
   */
  private scheduleIndexOptimization(): void {
    const scheduleNext = () => {
      const now = new Date();
      const nextHour = this.config.indexOptimization.scheduleHours.find(hour => hour > now.getHours()) 
        || this.config.indexOptimization.scheduleHours[0];
      
      const nextRun = new Date();
      if (nextHour <= now.getHours()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      nextRun.setHours(nextHour, 0, 0, 0);

      const delay = nextRun.getTime() - now.getTime();

      const timeout = setTimeout(async () => {
        try {
          logger.info('Running scheduled index optimization', {
            component: 'DatabaseIntegration'
          });

          const report = await this.indexOptimizer.analyzeIndexes();
          
          if (report.missingIndexes.length > 0 || report.unusedIndexes > 0) {
            logger.info(`Index optimization analysis completed`, {
              component: 'DatabaseIntegration',
              totalIndexes: report.totalIndexes,
              unusedIndexes: report.unusedIndexes,
              missingIndexes: report.missingIndexes.length,
              performanceImpact: report.performanceImpact
            });
          }

        } catch (error) {
          logger.error('Scheduled index optimization failed', {
            component: 'DatabaseIntegration',
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // Schedule next run
        scheduleNext();
      }, delay);

      this.scheduledTasks.push(timeout);
    };

    scheduleNext();
  }

  /**
   * Get service instances for direct access
   */
  getServices() {
    return {
      connectionPool: this.connectionPool,
      migrationManager: this.migrationManager,
      indexOptimizer: this.indexOptimizer,
      backupRecovery: this.backupRecovery,
      monitoring: this.monitoring,
      validation: this.validation
    };
  }

  /**
   * Execute a database query with automatic connection management
   */
  async query(text: string, params?: any[], useReadReplica = true): Promise<any> {
    return this.connectionPool.query(text, params, useReadReplica);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    return this.connectionPool.transaction(callback);
  }
}

// Export singleton instance
let databaseIntegration: DatabaseIntegrationService | null = null;

export function createDatabaseIntegration(config: DatabaseIntegrationConfig): DatabaseIntegrationService {
  if (databaseIntegration) {
    throw new Error('Database integration already exists. Use getDatabaseIntegration() to access it.');
  }
  
  databaseIntegration = new DatabaseIntegrationService(config);
  return databaseIntegration;
}

export function getDatabaseIntegration(): DatabaseIntegrationService {
  if (!databaseIntegration) {
    throw new Error('Database integration not initialized. Call createDatabaseIntegration() first.');
  }
  
  return databaseIntegration;
}

export async function closeDatabaseIntegration(): Promise<void> {
  if (databaseIntegration) {
    await databaseIntegration.shutdown();
    databaseIntegration = null;
  }
}
