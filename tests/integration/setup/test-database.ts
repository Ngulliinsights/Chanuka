/**
 * Test Database Setup
 * Manages test database lifecycle
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../../server/infrastructure/schema/foundation/index.js';

let testDb: ReturnType<typeof drizzle> | null = null;
let testConnection: ReturnType<typeof postgres> | null = null;

/**
 * Setup test database connection
 */
export async function setupTestDatabase() {
  const connectionString = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://localhost:5432/chanuka_test';
  
  testConnection = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  testDb = drizzle(testConnection, { schema });
  
  // Clean database before tests
  await cleanTestDatabase();
  
  return testDb;
}

/**
 * Clean test database (delete all test data)
 */
export async function cleanTestDatabase(): Promise<void> {
  if (!testDb) return;
  
  try {
    // Delete in reverse dependency order
    await testDb.delete(schema.comments);
    await testDb.delete(schema.bills);
    await testDb.delete(schema.sponsors);
    await testDb.delete(schema.users);
    await testDb.delete(schema.notifications);
  } catch (error) {
    console.warn('Error cleaning test database:', error);
  }
}

/**
 * Teardown test database connection
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testConnection) {
    await testConnection.end();
    testConnection = null;
  }
  testDb = null;
}

/**
 * Get current test database instance
 */
export function getTestDatabase() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}
