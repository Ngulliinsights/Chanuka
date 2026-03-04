/**
 * Unified Test Environment Setup
 * Configures consistent test environment across all modules
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setupRedisMock } from '../mocks/redis.mock';
import { setupPerformanceMock } from '../mocks/performance.mock';

// =============================================================================
// GLOBAL MOCK SETUP
// =============================================================================

// Setup Redis mocks
setupRedisMock();

// Setup Performance API mocks
setupPerformanceMock();

// =============================================================================
// ADDITIONAL GLOBAL MOCKS
// =============================================================================

// Mock fetch globally
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})) as unknown;

// Add WebSocket constants
Object.defineProperty(global.WebSocket, 'CONNECTING', { value: 0 });
Object.defineProperty(global.WebSocket, 'OPEN', { value: 1 });
Object.defineProperty(global.WebSocket, 'CLOSING', { value: 2 });
Object.defineProperty(global.WebSocket, 'CLOSED', { value: 3 });

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  } as unknown;
}

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
}));

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

beforeAll(() => {
  // Load .env file first to get actual database credentials
  // This allows tests to use the existing database
  const dotenv = require('dotenv');
  const path = require('path');
  
  // Load .env from project root
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn('⚠️  No .env file found, using default test environment variables');
  }
  
  // Set test environment variables (only if not already set from .env)
  process.env.NODE_ENV = 'test';
  
  // Use TEST_DATABASE_URL if available, otherwise use DATABASE_URL from .env
  // If neither exists, fall back to local test database
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    console.warn('⚠️  No DATABASE_URL or TEST_DATABASE_URL found, using default test database');
  }
  
  // Set other test environment variables (only if not already set)
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret';
  }
  if (!process.env.API_BASE_URL) {
    process.env.API_BASE_URL = 'http://localhost:3001/api';
  }
  
  // Suppress console output in tests
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  console.error = vi.fn();
  console.warn = vi.fn();
  console.log = vi.fn();
  
  // Store originals for restoration if needed
  (global as unknown).originalConsole = {
    error: originalConsoleError,
    warn: originalConsoleWarn,
    log: originalConsoleLog,
  };
});

afterAll(() => {
  // Restore console methods
  if ((global as unknown).originalConsole) {
    console.error = (global as unknown).originalConsole.error;
    console.warn = (global as unknown).originalConsole.warn;
    console.log = (global as unknown).originalConsole.log;
  }
});

// =============================================================================
// TEST CLEANUP
// =============================================================================

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup after each test
  vi.restoreAllMocks();
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

declare global {
  var testUtils: {
    nextTick: () => Promise<void>;
    mockApiResponse: (data: any, options?: { delay?: number; error?: Error }) => Promise<unknown>;
    mockQueryResponse: (data: any, options?: { isLoading?: boolean; error?: Error }) => any;
    mockMutationResponse: (options?: { isLoading?: boolean; error?: Error; data?: any }) => any;
    createMockUser: (overrides?: unknown) => any;
    createMockBill: (overrides?: unknown) => any;
    redis: {
      createMock: () => any;
      resetMocks: () => void;
    };
    performance: {
      createMock: () => any;
      mockTiming: (overrides?: Partial<PerformanceTiming>) => PerformanceTiming;
    };
  };
}

global.testUtils = {
  // Wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Mock API response helper
  mockApiResponse: (data: any, options: { delay?: number; error?: Error } = {}) => {
    const { delay = 0, error } = options;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (error) reject(error);
        else resolve(data);
      }, delay);
    });
  },
  
  // Mock query response helper
  mockQueryResponse: (data: any, options: { isLoading?: boolean; error?: Error } = {}) => ({
    data: options.error ? undefined : data,
    isLoading: options.isLoading ?? false,
    error: options.error,
    refetch: vi.fn(),
  }),
  
  // Mock mutation response helper
  mockMutationResponse: (options: { isLoading?: boolean; error?: Error; data?: any } = {}) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: options.isLoading ?? false,
    error: options.error,
    data: options.data,
    reset: vi.fn(),
  }),
  
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    role: 'citizen',
    verification_status: 'verified',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    reputation: 100,
    expertise: 'general',
    ...overrides,
  }),
  
  // Create mock bill
  createMockBill: (overrides = {}) => ({
    id: 'bill-1',
    title: 'Healthcare Reform Bill',
    summary: 'A comprehensive healthcare reform proposal',
    status: 'active',
    category: 'healthcare',
    sponsor: 'Senator Smith',
    introduced_date: new Date('2024-01-01'),
    last_action_date: new Date('2024-01-15'),
    votes: { yes: 45, no: 30, abstain: 5 },
    tags: ['healthcare', 'reform', 'insurance'],
    ...overrides,
  }),
  
  // Redis utilities
  redis: {
    createMock: () => {
      const { createRedisMock } = require('../mocks/redis.mock');
      return createRedisMock();
    },
    resetMocks: () => {
      // Reset is handled by beforeEach vi.clearAllMocks()
    },
  },
  
  // Performance utilities
  performance: {
    createMock: () => {
      const { createPerformanceMock } = require('../mocks/performance.mock');
      return createPerformanceMock();
    },
    mockTiming: (overrides: Partial<PerformanceTiming> = {}) => {
      const { performanceMockUtils } = require('../mocks/performance.mock');
      return performanceMockUtils.mockTiming(overrides);
    },
  },
};