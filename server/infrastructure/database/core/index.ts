/**
 * Unified Database Core Module
 *
 * Main entry point for the consolidated database infrastructure.
 * Provides a clean, consistent API that combines the best features
 * from both existing database systems.
 */

import { createDatabaseConfig } from '@server/infrastructure/database/core/config';
import type { ConnectionManagerConfig } from '@server/infrastructure/database/core/connection-manager';
import { createConnectionManager, closeConnectionManager } from '@server/infrastructure/database/core/connection-manager';
import { createHealthMonitor, stopHealthMonitor } from '@server/infrastructure/database/core/health-monitor';

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

export {
  // Core connection manager
  UnifiedConnectionManager,
  createConnectionManager,
  getConnectionManager,
  closeConnectionManager,
  
  // Convenience functions (backward compatibility)
  getDatabase,
  withTransaction,
  withReadConnection,
  checkDatabaseHealth,
  closeDatabaseConnections,
  
  // Types
  type DatabaseOperation,
  type TransactionOptions,
  type DatabaseTransaction,
  type ConnectionManagerConfig,
  type ConnectionMetrics,
  type DatabaseHealthStatus,
} from '@server/infrastructure/database/core/connection-manager.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

export {
  // Configuration functions
  createDatabaseConfig,
  validateDatabaseConfig,
  createSpecializedDatabaseConfig,
  getDatabaseUrl,
  parseDatabaseUrl,
  
  // Default configurations
  defaultDatabaseConfig,
  
  // Environment variables documentation
  DATABASE_ENV_VARS,
  
  // Types
  type DatabaseEnvironmentConfig,
} from '@server/infrastructure/database/core/config.ts';

// ============================================================================
// HEALTH MONITORING
// ============================================================================

export {
  // Health monitor
  UnifiedHealthMonitor,
  createHealthMonitor,
  getHealthMonitor,
  stopHealthMonitor,
  
  // Types
  type HealthCheckResult,
  type HealthMetrics,
  type AlertRule,
  type Alert,
  type HealthMonitorConfig,
} from '@server/infrastructure/database/core/health-monitor.ts';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Initialize the complete database system with sensible defaults.
 * 
 * This is the recommended way to set up the database for most applications.
 * It creates and initializes the connection manager and health monitor.
 * 
 * @param config Optional configuration overrides
 * @returns Initialized connection manager and health monitor
 * 
 * @example
 * ```typescript
 * import { initializeDatabase } from '@server/infrastructure/database/core';
 * 
 * const { connectionManager, healthMonitor } = await initializeDatabase({
 *   max: 10,
 *   readReplicaUrls: ['postgresql://read1.example.com/db']
 * });
 * 
 * // Use the database
 * const db = connectionManager.getDatabase('read');
 * const users = await db.select().from(usersTable);
 * ```
 */
export async function initializeDatabase(config?: Partial<ConnectionManagerConfig>): Promise<void> {
  const dbConfig = createDatabaseConfig();
  const finalConfig = { ...dbConfig, ...config };
  
  const connectionManager = await createConnectionManager(finalConfig);
  const healthMonitor = createHealthMonitor(connectionManager);
  
  // Start health monitoring
  healthMonitor.start();
  
  return {
    connectionManager,
    healthMonitor,
    config: finalConfig
  };
}

/**
 * Gracefully shutdown the database system.
 * 
 * Stops health monitoring and closes all database connections.
 * Should be called during application shutdown.
 * 
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await shutdownDatabase();
 *   process.exit(0);
 * });
 * ```
 */
export async function shutdownDatabase(): Promise<void> {
  try {
    // Stop health monitoring first
    stopHealthMonitor();
    
    // Close all database connections
    await closeConnectionManager();
    
    console.log('Database system shutdown completed');
  } catch (error) {
    console.error('Error during database shutdown:', error);
    throw error;
  }
}

/**
 * Quick database setup for development and testing.
 * 
 * Provides a simplified setup with minimal configuration.
 * Not recommended for production use.
 * 
 * @param environment Development environment ('development' | 'test')
 * @returns Basic connection manager
 */
export async function quickSetup(environment: 'development' | 'test' = 'development'): Promise<void> {
  const config = createDatabaseConfig(environment);
  return await createConnectionManager(config);
}

// ============================================================================
// VERSION AND METADATA
// ============================================================================

/**
 * Database core module version and metadata.
 */
export const DATABASE_CORE_VERSION = '1.0.0';
export const DATABASE_CORE_NAME = 'Chanuka Unified Database Core';

/**
 * Feature flags for the database system.
 */
export const FEATURES = {
  CONNECTION_POOLING: true,
  READ_REPLICA_ROUTING: true,
  HEALTH_MONITORING: true,
  TRANSACTION_RETRY: true,
  MULTI_DATABASE_SUPPORT: true,
  METRICS_COLLECTION: true,
  ALERT_SYSTEM: true,
} as const;


