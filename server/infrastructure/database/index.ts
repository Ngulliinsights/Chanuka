// Database Infrastructure
// Centralized exports for database-related services

// Services
export { DatabaseService } from './database-service';
export { databaseOptimizationService as DatabaseOptimizationService } from './database-optimization';
export { DatabaseFallbackService } from './database-fallback';
export { connectionPoolService as ConnectionPoolService } from './connection-pool';
export { MigrationService } from './migration-service';
export { SeedDataService } from './seed-data-service';
export { storage as StorageService } from './storage';
export { unifiedStorage as UnifiedStorageService } from './unified-storage';

// Storage Base
export * from './base/BaseStorage';

// Configuration
export * from './config';

// Re-export stable DB accessors and legacy names for compatibility.
export {
	getDbInstance,
	getFallbackService,
	getConnectionStatus,
	isDatabaseConnected,
	readDatabase,
	pool as getPool,
	db as legacyDb,
	fallbackService as legacyFallbackService
} from '../../db.ts';

// Also export other DB utilities (legacy surface)
export * from '../../db.ts';






