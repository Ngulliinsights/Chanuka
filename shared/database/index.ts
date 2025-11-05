// Re-export database service from the infrastructure layer
export { databaseService } from '@server/infrastructure/database/database-service';

// Re-export connection utilities
export { database, readDatabase, writeDatabase, pool } from './connection';

// Re-export multi-database architecture exports
export { operationalDb, analyticsDb, securityDb } from './connection';

// Re-export transaction utilities
export { withTransaction, withReadConnection } from './connection';

// Re-export database management utilities
export { checkDatabaseHealth, closeDatabaseConnections } from './connection';

// Re-export schema
export * from '../schema';

// Re-export types
export type { DatabaseTransaction, DatabaseOperation, TransactionOptions } from './connection';
