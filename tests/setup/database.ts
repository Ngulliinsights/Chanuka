/**
 * Test Database Setup
 * 
 * Simplified setup that uses database pools directly without orchestrator.
 * This avoids complex initialization that might cause authentication issues.
 */

import { beforeAll, afterAll } from 'vitest';
import { pool, closePools } from '../../server/infrastructure/database/pool';

let isInitialized = false;

/**
 * Initialize test database
 * Called once before all tests
 */
export async function setupTestDatabase(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️  Database already initialized, skipping...');
    return;
  }

  try {
    console.log('🔧 Initializing test database...');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    
    // Use TEST_DATABASE_URL if available, otherwise fall back to DATABASE_URL
    if (process.env.TEST_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      console.log('📊 Using TEST_DATABASE_URL for tests');
    } else if (process.env.DATABASE_URL) {
      console.log('📊 Using DATABASE_URL for tests (no TEST_DATABASE_URL found)');
    } else {
      throw new Error('No database URL configured. Set DATABASE_URL or TEST_DATABASE_URL in .env file');
    }
    
    // Test database connection with a simple query
    console.log('🔍 Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result.rows[0]);

    isInitialized = true;
    console.log('✅ Test database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Cleanup test database
 * Called once after all tests
 */
export async function teardownTestDatabase(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    console.log('🧹 Cleaning up test database...');
    await closePools();
    isInitialized = false;
    console.log('✅ Test database cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
    // Don't throw - cleanup errors shouldn't fail tests
  }
}

/**
 * Check if database is initialized
 */
export function isTestDatabaseInitialized(): boolean {
  return isInitialized;
}

// ============================================================================
// Vitest Lifecycle Hooks
// ============================================================================

// Setup database before all tests
beforeAll(async () => {
  await setupTestDatabase();
}, 30000); // 30 second timeout for database initialization

// Cleanup database after all tests
afterAll(async () => {
  await teardownTestDatabase();
}, 10000); // 10 second timeout for cleanup

// ============================================================================
// Export for manual usage
// ============================================================================

export default {
  setup: setupTestDatabase,
  teardown: teardownTestDatabase,
  isInitialized: isTestDatabaseInitialized,
};
