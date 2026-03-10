/**
 * Global Test Setup
 * 
 * Global setup and teardown for all bill feature tests.
 */

import { beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

// Global test state
let globalStartTime: number;
let testDatabase: any;
let testCache: any;

export async function setup() {
  console.log('🚀 Setting up Bills Feature Test Environment');
  
  globalStartTime = performance.now();
  
  // Setup test database (mock)
  testDatabase = {
    connected: true,
    queries: [],
    reset: () => {
      testDatabase.queries = [];
    },
  };
  
  // Setup test cache (mock)
  testCache = new Map();
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Mock external dependencies
  await setupMocks();
  
  console.log('✅ Test environment setup complete');
}

export async function teardown() {
  const duration = performance.now() - globalStartTime;
  
  console.log('🧹 Cleaning up Bills Feature Test Environment');
  
  // Cleanup test database
  if (testDatabase) {
    testDatabase.connected = false;
    testDatabase.queries = [];
  }
  
  // Cleanup test cache
  if (testCache) {
    testCache.clear();
  }
  
  // Reset environment variables
  delete process.env.LOG_LEVEL;
  
  console.log(`✅ Test environment cleanup complete (${Math.round(duration)}ms total)`);
}

async function setupMocks() {
  // Mock logger to reduce noise
  const mockLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  
  // Mock database connections
  const mockDatabase = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
          groupBy: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
        leftJoin: () => ({
          where: () => ({
            groupBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }),
  };
  
  // Mock cache service
  const mockCacheService = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
  
  // Store mocks globally for test access
  (global as any).testMocks = {
    logger: mockLogger,
    database: mockDatabase,
    cache: mockCacheService,
  };
}

// Export test utilities
export const testUtils = {
  createMockBill: (overrides = {}) => ({
    id: 'test-bill-id',
    title: 'Test Bill',
    summary: 'Test Summary',
    status: 'draft',
    category: 'technology',
    introduced_date: '2024-01-15',
    bill_number: 'HR-2024-TEST',
    full_text: 'Full text...',
    sponsor_id: 'test-sponsor',
    tags: ['test'],
    last_action_date: '2024-01-20',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-20'),
    comment_count: 0,
    view_count: 0,
    share_count: 0,
    engagement_score: '0',
    complexity_score: 5,
    ...overrides,
  }),
  
  createMockDataSource: () => ({
    findById: () => Promise.resolve(null),
    findAll: () => Promise.resolve([]),
    count: () => Promise.resolve(0),
    getStats: () => Promise.resolve({
      total: 0,
      byStatus: {},
      byCategory: {},
    }),
    isAvailable: () => Promise.resolve(true),
    getStatus: () => ({
      type: 'mock' as const,
      available: true,
      lastCheck: new Date(),
    }),
  }),
  
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
};