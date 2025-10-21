// Database Infrastructure - Consolidated
// Uses shared/database for core functionality, keeps server-specific services

// Core database functionality from shared
export {
  database,
  readDatabase,
  writeDatabase,
  withTransaction,
  withReadConnection,
  getDatabase,
  pool
} from '../../../shared/database/connection';

// Database schema and types
export * from '../../../shared/schema';

// Server-specific services (keep these)
export { DatabaseFallbackService } from './database-fallback';
export { MigrationService } from './migration-service';
export { SeedDataService } from './seed-data-service';

// Storage services (if they provide unique server-specific value)
export { storage as StorageService } from './storage';
export { unifiedStorage as UnifiedStorageService } from './unified-storage';

// Storage base classes
export * from './base/BaseStorage';

// Configuration
export * from './config';

// Database optimization (if it provides unique server-specific value)
export { databaseOptimizationService as DatabaseOptimizationService } from './database-optimization';

// Legacy compatibility exports
export { database as DatabaseService } from '../../../shared/database/connection';
export { pool as ConnectionPoolService } from '../../../shared/database/connection';

// Re-export database types for convenience
export type {
  DatabaseTransaction,
  DatabaseOperation,
  TransactionOptions
} from '../../../shared/database/connection';











































