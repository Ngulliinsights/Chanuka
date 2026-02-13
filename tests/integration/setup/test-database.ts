/**
 * Test Database Setup
 * Manages test database lifecycle for integration tests
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../../../server/infrastructure/schema/foundation';

let testDb: ReturnType<typeof drizzle> | null = null;
let testConnection: ReturnType<typeof postgres> | null = null;

/**
 * Initialize test database connection
 */
export async function setupTestDatabase() {
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for integration tests');
  }

  // Create connection
  testConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Create Drizzle instance
  testDb = drizzle(testConnection, { schema });

  // Run migrations
  await migrate(testDb, { migrationsFolder: './drizzle' });

  return testDb;
}

/**
 * Clean test database (truncate all tables)
 */
export async function cleanTestDatabase() {
  if (!testConnection) {
    throw new Error('Test database not initialized');
  }

  // Truncate all tables in reverse dependency order
  await testConnection`
    TRUNCATE TABLE 
      committee_members,
      committees,
      parliamentary_sittings,
      parliamentary_sessions,
      governors,
      sponsors,
      user_profiles,
      users
    CASCADE
  `;
}

/**
 * Teardown test database connection
 */
export async function teardownTestDatabase() {
  if (testConnection) {
    await testConnection.end();
    testConnection = null;
    testDb = null;
  }
}

/**
 * Get test database instance
 */
export function getTestDatabase() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Execute raw SQL query (for test setup)
 */
export async function executeRawSql(sql: string) {
  if (!testConnection) {
    throw new Error('Test database connection not initialized');
  }
  return testConnection.unsafe(sql);
}
