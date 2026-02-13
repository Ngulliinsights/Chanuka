/**
 * Vitest Setup for Integration Tests
 * Configures test environment and global utilities
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure required environment variables are set
beforeAll(() => {
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for integration tests');
  }
});

// Global cleanup
afterAll(() => {
  // Any global cleanup if needed
});
