/**
 * Test Context
 * Manages test environment setup and teardown
 */

import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase, getTestDatabase } from '../setup/test-database';
import { setupTestServer, teardownTestServer } from '../setup/test-server';
import { createTestApiClient, TestApiClient } from '../client/api-client';

export interface TestContext {
  db: ReturnType<typeof getTestDatabase>;
  apiClient: TestApiClient;
  baseUrl: string;
}

let globalTestContext: TestContext | null = null;

/**
 * Setup full integration test environment
 */
export async function setupIntegrationTest(): Promise<TestContext> {
  // Setup database
  const db = await setupTestDatabase();
  
  // Setup server
  const { baseUrl } = await setupTestServer();
  
  // Create API client
  const apiClient = createTestApiClient(baseUrl);
  
  globalTestContext = {
    db,
    apiClient,
    baseUrl,
  };
  
  return globalTestContext;
}

/**
 * Clean test data between tests
 */
export async function cleanIntegrationTest(): Promise<void> {
  await cleanTestDatabase();
}

/**
 * Teardown full integration test environment
 */
export async function teardownIntegrationTest(): Promise<void> {
  await teardownTestServer();
  await teardownTestDatabase();
  globalTestContext = null;
}

/**
 * Get current test context
 */
export function getTestContext(): TestContext {
  if (!globalTestContext) {
    throw new Error('Test context not initialized. Call setupIntegrationTest() first.');
  }
  return globalTestContext;
}
