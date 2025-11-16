/**
 * Database Infrastructure Index
 * 
 * Main entry point for database integration services
 */

// Core services
export { 
  DatabaseConnectionPool,
  createConnectionPool,
  getConnectionPool,
  closeConnectionPool
} from './connection-pool.js';

export { 
  DatabaseMigrationManager,
  createMigrationManager,
  getMigrationManager
} from './migration-manager.js';

export { 
  DatabaseIndexingOptimizer,
  createIndexOptimizer,
  getIndexOptimizer
} from './indexing-optimizer.js';

export { 
  DatabaseBackupRecovery,
  createBackupRecovery,
  getBackupRecovery
} from './backup-recovery.js';

export { 
  DatabaseMonitoring,
  createDatabaseMonitoring,
  getDatabaseMonitoring
} from './monitoring.js';

export { 
  DatabaseValidation,
  createDatabaseValidation,
  getDatabaseValidation
} from './validation.js';

// Main integration service
export { 
  DatabaseIntegrationService,
  createDatabaseIntegration,
  getDatabaseIntegration,
  closeDatabaseIntegration
} from './database-integration.js';

// Configuration
export { 
  createDatabaseConfig,
  defaultDatabaseConfig
} from './config.js';

// Types
export type { ConnectionPoolConfig } from './connection-pool.js';
export type { MigrationResult, MigrationStatus } from './migration-manager.js';
export type { IndexOptimizationReport, MissingIndexSuggestion } from './indexing-optimizer.js';
export type { BackupConfig, BackupMetadata, RecoveryOptions } from './backup-recovery.js';
export type { DatabaseMetrics, Alert, AlertRule } from './monitoring.js';
export type { ValidationRule, DataQualityReport, IntegrityCheckResult } from './validation.js';
export type { DatabaseIntegrationConfig, DatabaseHealthStatus } from './database-integration.js';