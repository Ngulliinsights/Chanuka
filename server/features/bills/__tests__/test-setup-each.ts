/**
 * Per-Test Setup
 * 
 * Setup and teardown that runs before/after each individual test.
 */

import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset any global state
  if ((global as any).testMocks) {
    const mocks = (global as any).testMocks;
    
    // Reset mock call counts
    if (mocks.logger) {
      Object.values(mocks.logger).forEach((fn: any) => {
        if (typeof fn === 'function' && fn.mockClear) {
          fn.mockClear();
        }
      });
    }
  }
  
  // Reset environment variables that might affect tests
  delete process.env.BILLS_DATA_SOURCE_TYPE;
  delete process.env.CACHE_DISABLED;
  
  // Reset Date.now if it was mocked
  if (vi.isMockFunction(Date.now)) {
    vi.restoreAllMocks();
  }
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
  
  // Clean up any test-specific global state
  if ((global as any).testState) {
    delete (global as any).testState;
  }
  
  // Ensure no timers are left running
  vi.clearAllTimers();
});