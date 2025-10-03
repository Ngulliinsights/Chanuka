import { drizzle } from 'drizzle-orm/node-postgres';
import { pool, readDb, writeDb, db } from './pool.js';
import * as schema from '../schema.js';

// Export the main database connection with full schema
export const database = db;

// Export specialized connections for read/write operations
export const readDatabase = readDb;
export const writeDatabase = writeDb;

// Export the raw pool for direct SQL queries when needed
export { pool };

// Export all schema tables and types for easy importing
export * from '../schema.js';

// Helper function to get the appropriate database connection based on operation type
export function getDatabase(operation: 'read' | 'write' | 'general' = 'general') {
  switch (operation) {
    case 'read':
      return readDatabase;
    case 'write':
      return writeDatabase;
    default:
      return database;
  }
}

// Transaction helper for write operations
export async function withTransaction<T>(
  callback: (tx: typeof writeDatabase) => Promise<T>
): Promise<T> {
  return writeDatabase.transaction(callback);
}