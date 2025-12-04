/**
 * Shared Module Test Setup
 * 
 * Global test configuration for the shared module
 */

import { vi } from 'vitest';

// Mock console methods in test environment
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: vi.fn(),
  warn: vi.fn(),
  // Mock info and debug to reduce noise
  info: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/chanuka_test';

// Global test utilities
global.testUtils = {
  mockDate: (date: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(date));
  },
  restoreDate: () => {
    vi.useRealTimers();
  },
};

// Extend global types for test utilities
declare global {
  var testUtils: {
    mockDate: (date: string) => void;
    restoreDate: () => void;
  };
}