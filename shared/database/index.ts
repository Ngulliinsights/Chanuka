/**
 * Unified Database Infrastructure
 *
 * This module provides a single entry point for all database-related
 * functionality across the Chanuka platform, promoting cohesion and
 * consistency in database operations.
 */

// Import types and classes for re-export
import {
  UnifiedConnectionManager,
  closeConnectionManager,
} from './core/connection-manager';
import {
  DatabaseOrchestrator,
  getDatabaseOrchestrator,
  shutdownDatabaseOrchestrator,
} from './core/database-orchestrator';
import type {
  DatabaseStatus,
  DatabaseMetrics,
} from './core/database-orchestrator';
import type {
  DatabaseConfig,
  FeatureConfig,
} from './core/unified-config';
import {
  DatabaseConfigManager,
  getDatabaseConfig,
  createTestDatabaseConfig,
} from './core/unified-config';
import { BaseDatabaseScript } from './utils/base-script';

// ============================================================================
// Core Infrastructure Exports
// ============================================================================

// Configuration Management
export {
  DatabaseConfigManager,
  getDatabaseConfig,
  createTestDatabaseConfig,
  type DatabaseConfig,
  type FeatureConfig,
} from './core/unified-config';

// Database Orchestration
export {
  DatabaseOrchestrator,
  getDatabaseOrchestrator,
  shutdownDatabaseOrchestrator,
  type DatabaseStatus,
  type DatabaseMetrics,
} from './core/database-orchestrator';

// Connection Management (re-export existing)
export {
  UnifiedConnectionManager,
  closeConnectionManager,
} from './core/connection-manager';

// Health Monitoring (re-export existing)

// ============================================================================
// Utility Exports
// ============================================================================

// Script Infrastructure
export {
  BaseDatabaseScript,
} from './utils/base-script';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize the complete database infrastructure
 * 
 * This function sets up the entire database stack including configuration,
 * orchestration, and monitoring in a single call.
 */
export async function initializeDatabase(options?: {
  environment?: string;
  enableHealthMonitoring?: boolean;
  enableMigrations?: boolean;
  configOverrides?: Partial<DatabaseConfig>;
}): Promise<DatabaseOrchestrator> {
  const {
    environment,
    enableHealthMonitoring = true,
    enableMigrations = true,
    configOverrides,
  } = options || {};

  // Initialize configuration
  const configManager = getDatabaseConfig();
  if (!configManager['config']) {
    configManager.loadFromEnvironment();
  }

  // Apply environment override if specified
  if (environment) {
    configManager.initialize(configManager['config']!, environment);
  }

  // Apply configuration overrides
  if (configOverrides) {
    const currentConfig = configManager['config']!;
    const mergedConfig = {
      ...currentConfig,
      ...configOverrides,
      environments: {
        ...currentConfig.environments,
        ...configOverrides.environments,
      },
      operations: {
        ...currentConfig.operations,
        ...configOverrides.operations,
      },
    };
    configManager.initialize(mergedConfig, environment);
  }

  // Create and initialize orchestrator
  const orchestrator = new DatabaseOrchestrator({
    autoInitialize: true,
    enableHealthMonitoring,
    enableMigrations,
  });

  await orchestrator.initialize();
  return orchestrator;
}

/**
 * Shutdown the complete database infrastructure
 * 
 * This function gracefully shuts down all database services and connections.
 */
export async function shutdownDatabase(): Promise<void> {
  try {
    await shutdownDatabaseOrchestrator();
  } catch (error) {
    // Fallback to individual shutdowns if orchestrator fails
    try {
      await closeConnectionManager();
    } catch (fallbackError) {
      console.error('Error during database shutdown:', fallbackError);
    }
  }
}

/**
 * Quick setup for development environments
 * 
 * Provides a simple way to get a working database connection
 * for development and testing.
 */
export async function quickSetup(environment: 'development' | 'test' = 'development'): Promise<{
  orchestrator: DatabaseOrchestrator;
  connectionManager: UnifiedConnectionManager;
  config: DatabaseConfigManager;
}> {
  const orchestrator = await initializeDatabase({
    environment,
    enableHealthMonitoring: environment === 'development',
    enableMigrations: true,
  });

  const connectionManager = orchestrator.getConnectionManager();
  const config = getDatabaseConfig();

  return {
    orchestrator,
    connectionManager,
    config,
  };
}

/**
 * Get database health status across all components
 * 
 * Provides a unified view of database health for monitoring
 * and alerting systems.
 */
export async function getDatabaseHealth(): Promise<{
  healthy: boolean;
  status: DatabaseStatus;
  metrics: DatabaseMetrics;
  issues: string[];
}> {
  try {
    const orchestrator = getDatabaseOrchestrator();
    
    const [status, metrics, healthCheck] = await Promise.all([
      orchestrator.getStatus(),
      orchestrator.getMetrics(),
      orchestrator.performHealthCheck(),
    ]);

    return {
      healthy: healthCheck.healthy && status.healthy,
      status,
      metrics,
      issues: healthCheck.issues,
    };
  } catch (error) {
    return {
      healthy: false,
      status: {
        initialized: false,
        healthy: false,
        connections: {
          primary: false,
          replicas: false,
          analytics: false,
          security: false,
        },
        services: {
          healthMonitor: false,
          migrations: false,
          backups: false,
        },
        lastHealthCheck: new Date(),
        uptime: 0,
      },
      metrics: {
        connections: { total: 0, active: 0, idle: 0, waiting: 0 },
        performance: { averageQueryTime: 0, slowQueries: 0, errorRate: 0 },
        health: { status: 'unhealthy', lastCheck: new Date(), issues: [] },
      },
      issues: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Execute a database operation with unified error handling
 * 
 * Provides a consistent interface for database operations across
 * the platform with automatic retry and error handling.
 */
export async function executeWithDatabase<T>(
  operation: (connectionManager: UnifiedConnectionManager) => Promise<T>,
  options?: {
    retries?: number;
    timeout?: number;
  }
): Promise<T> {
  const orchestrator = getDatabaseOrchestrator();
  const connectionManager = orchestrator.getConnectionManager();
  
  const { retries = 3, timeout = 30000 } = options || {};
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(connectionManager),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        }),
      ]);
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === retries) {
        break;
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Check if the database infrastructure is initialized
 */
export function isDatabaseInitialized(): boolean {
  try {
    const orchestrator = getDatabaseOrchestrator();
    return orchestrator.isInitialized();
  } catch {
    return false;
  }
}

/**
 * Get current database environment
 */
export function getCurrentDatabaseEnvironment(): string {
  try {
    const config = getDatabaseConfig();
    return config.getCurrentEnvironment();
  } catch {
    return 'unknown';
  }
}

/**
 * Check if a feature is enabled in the current environment
 */
export function isDatabaseFeatureEnabled(feature: keyof FeatureConfig): boolean {
  try {
    const config = getDatabaseConfig();
    return config.isFeatureEnabled(feature);
  } catch {
    return false;
  }
}

// ============================================================================
// Direct Database Connection Exports
// ============================================================================

// Re-export database connections for backward compatibility
export {
  database,
  readDatabase,
  writeDatabase,
  operationalDb,
  analyticsDb,
  securityDb,
  pool,
  getDatabase,
  withTransaction,
  withReadConnection,
  checkDatabaseHealth,
  closeDatabaseConnections,
  type DatabaseOperation,
} from './connection';

// Re-export actual Drizzle database instances from pool
export {
  db,
  readDb,
  writeDb,
} from './pool';

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Legacy database connection getter for backward compatibility
 *
 * @deprecated Use getDatabaseOrchestrator().getConnectionManager() instead
 */
export function getLegacyDatabase() {
  console.warn('getLegacyDatabase() is deprecated. Use getDatabaseOrchestrator().getConnectionManager() instead.');

  try {
    const orchestrator = getDatabaseOrchestrator();
    return orchestrator.getConnectionManager().getDatabase();
  } catch (error) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
}

// ============================================================================
// Development and Testing Utilities
// ============================================================================

/**
 * Reset database state for testing
 * 
 * WARNING: This function is intended for testing only and will
 * destroy all data in the database.
 */
export async function resetDatabaseForTesting(): Promise<void> {
  if (getCurrentDatabaseEnvironment() === 'production') {
    throw new Error('Cannot reset database in production environment');
  }
  
  // const orchestrator = getDatabaseOrchestrator();
  
  // Implementation would depend on your specific reset requirements
  // This is a placeholder for the actual reset logic
  console.warn('Database reset functionality not yet implemented');
}

/**
 * Create a test database configuration
 */
export function createTestConfig(): DatabaseConfig {
  return createTestDatabaseConfig();
}

// ============================================================================
// Export Default for Convenience
// ============================================================================

export default {
  // Core functions
  initializeDatabase,
  shutdownDatabase,
  quickSetup,
  getDatabaseHealth,
  executeWithDatabase,
  
  // Utilities
  isDatabaseInitialized,
  getCurrentDatabaseEnvironment,
  isDatabaseFeatureEnabled,
  
  // Classes
  DatabaseOrchestrator,
  DatabaseConfigManager,
  BaseDatabaseScript,
};


