/**
 * Database Initialization
 * 
 * Handles the initialization of database connections to avoid circular dependencies.
 * This must be called during application startup before any database operations.
 */

import { initializeDatabaseConnections } from './connection';
import { db, readDb, writeDb, pool } from './pool';
import type { DatabaseConnection } from './connection';

let isInitialized = false;

/**
 * Initialize all database connections.
 * This breaks the circular dependency between connection.ts and pool.ts
 * by providing a separate initialization entry point.
 */
export function initializeDatabase(): void {
  if (isInitialized) {
    return;
  }

  initializeDatabaseConnections(
    db as unknown as DatabaseConnection,
    readDb as unknown as DatabaseConnection,
    writeDb as unknown as DatabaseConnection,
    pool
  );

  isInitialized = true;
}

/**
 * Check if database has been initialized
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset initialization state (for testing only)
 */
export function resetInitialization(): void {
  isInitialized = false;
}
