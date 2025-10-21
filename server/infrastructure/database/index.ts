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

// Database Tables
export * from '../../../shared/schema';

// Re-export stable DB accessors and legacy names from canonical shared connection
export {
	database,
	readDatabase,
	writeDatabase,
	withTransaction,
	withReadConnection,
	pool as getPool
} from '@shared/database/connection';

// Also export schema tables from shared schema for compatibility
export * from '../../../shared/schema';











































