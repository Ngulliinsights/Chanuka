/**
 * Database Service - Compatibility Layer
 * 
 * This module provides a unified interface to the database infrastructure
 * for backward compatibility with existing code that imports `databaseService`.
 * 
 * New code should import directly from '@server/infrastructure/database':
 * - `db` for the main database connection
 * - `readDb` for read-only operations
 * - `writeDb` for write operations
 * - `getDatabaseOrchestrator()` for orchestration
 */

import { db, readDb, writeDb } from './pool';
import { 
  database,
  readDatabase,
  writeDatabase,
  withTransaction,
  withReadConnection,
  checkDatabaseHealth,
  closeDatabaseConnections,
  type DatabaseOperation,
} from './connection';
import {
  getDatabaseOrchestrator,
  type DatabaseStatus,
  type DatabaseMetrics,
} from './core/database-orchestrator';

/**
 * Unified database service interface
 * 
 * Provides access to all database connections and operations
 * through a single service object.
 */
export class DatabaseService {
  /**
   * Main database connection (Drizzle ORM instance)
   * Use this for most database operations
   */
  get db() {
    return db;
  }

  /**
   * Read-only database connection
   * Use this for read operations to distribute load
   */
  get readDb() {
    return readDb;
  }

  /**
   * Write-optimized database connection
   * Use this for write-heavy operations
   */
  get writeDb() {
    return writeDb;
  }

  /**
   * Legacy database connection getter
   * @deprecated Use db, readDb, or writeDb instead
   */
  get database() {
    return database;
  }

  /**
   * Read database connection (legacy)
   * @deprecated Use readDb instead
   */
  get readDatabase() {
    return readDatabase;
  }

  /**
   * Write database connection (legacy)
   * @deprecated Use writeDb instead
   */
  get writeDatabase() {
    return writeDatabase;
  }

  /**
   * Execute a database operation within a transaction
   */
  async withTransaction<T>(operation: DatabaseOperation<T>): Promise<T> {
    return withTransaction(operation);
  }

  /**
   * Execute a read-only operation
   */
  async withReadConnection<T>(operation: DatabaseOperation<T>): Promise<T> {
    return withReadConnection(operation);
  }

  /**
   * Check database health status
   */
  async checkHealth(): Promise<boolean> {
    return checkDatabaseHealth();
  }

  /**
   * Get detailed database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    const orchestrator = getDatabaseOrchestrator();
    return orchestrator.getStatus();
  }

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    const orchestrator = getDatabaseOrchestrator();
    return orchestrator.getMetrics();
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await closeDatabaseConnections();
  }

  /**
   * Get the database orchestrator for advanced operations
   */
  getOrchestrator() {
    return getDatabaseOrchestrator();
  }
}

/**
 * Singleton instance of the database service
 * 
 * Import this for backward compatibility:
 * ```typescript
 * import { databaseService } from '@server/infrastructure/database/database-service';
 * ```
 */
export const databaseService = new DatabaseService();

/**
 * Default export for convenience
 */
export default databaseService;
