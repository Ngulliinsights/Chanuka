/**
 * Validation Test Setup
 *
 * Test configuration for validation module
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Mock environment variables for testing
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.USE_UNIFIED_VALIDATION = 'true';

  // Mock logger to prevent setup issues
  const mockLogger = {
    on: () => {},
    off: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  (global as any).logger = mockLogger;
  (global as any).loggingService = mockLogger;
});

// Clean up after all tests
afterAll(() => {
  // Clean up any global resources
});

// Reset state before each test
beforeEach(() => {
  // Clear any caches or state that might affect tests
});

// Clean up after each test
afterEach(() => {
  // Clean up test-specific resources
});

// Global test utilities for validation
export const validationTestUtils = {
  /**
   * Create a mock validation result
   */
  createMockValidationResult: (success: boolean, data?: any, errors?: any[]) => ({
    success,
    data,
    errors: errors || [],
  }),

  /**
   * Create mock validation options
   */
  createMockValidationOptions: (overrides: any = {}) => ({
    useCache: false,
    preprocess: true,
    strict: false,
    ...overrides,
  }),

  /**
   * Create mock batch validation result
   */
  createMockBatchResult: (valid: any[], invalid: any[], totalCount: number) => ({
    valid,
    invalid,
    totalCount,
    validCount: valid.length,
    invalidCount: invalid.length,
  }),
};

// Make test utilities globally available
declare global {
  var validationTestUtils: any;
}

global.validationTestUtils = validationTestUtils;







































