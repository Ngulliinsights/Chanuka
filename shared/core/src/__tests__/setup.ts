/**
 * Test Setup
 * 
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { logger } from '../utils/logger';

// Mock environment variables for testing
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.SESSION_SECRET = 'test-session-secret-key-for-testing';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/triplecheck_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  process.env.CACHE_PROVIDER = 'memory'; // Use memory cache for tests
  process.env.RATE_LIMIT_PROVIDER = 'memory'; // Use memory rate limiting for tests
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

// Global test utilities
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a mock configuration for testing
   */
  createMockConfig: () => ({
    app: {
      name: 'test-app',
      version: '1.0.0',
      environment: 'test' as const,
      port: 3000,
      host: 'localhost',
    },
    cache: {
      provider: 'memory' as const,
      defaultTtlSec: 300,
      redisUrl: 'redis://localhost:6379/1',
      legacyCompression: true,
      legacyPrefixing: true,
      maxMemoryMB: 100,
      compressionThreshold: 1024,
      l1MaxSizeMB: 50,
    },
    log: {
      level: 'error' as const,
      pretty: false,
      redactPaths: ['*.password', '*.token'],
      asyncTransport: false,
      maxFileSize: '10mb',
      maxFiles: 5,
      enableMetrics: false,
    },
    rateLimit: {
      provider: 'memory' as const,
      defaultMax: 100,
      defaultWindowMs: 60000,
      legacyResponseBody: true,
      algorithm: 'sliding-window' as const,
      burstAllowance: 0.2,
      enableDistributedMode: false,
    },
    errors: {
      includeStack: false,
      logErrors: false,
      reportToSentry: false,
      maxStackTraceDepth: 20,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
    },
    security: {
      jwtSecret: 'test-jwt-secret-key-for-testing-only',
      jwtExpiryHours: 24,
      jwtRefreshExpiryHours: 168,
      bcryptRounds: 10,
      corsOrigins: ['http://localhost:3000'],
      rateLimitByIp: true,
      enableCsrf: false,
      sessionSecret: 'test-session-secret-key-for-testing',
      maxRequestSize: '10mb',
    },
    storage: {
      provider: 'local' as const,
      localPath: './test-uploads',
      maxFileSizeMB: 10,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      enableVirusScanning: false,
      compressionQuality: 85,
    },
    database: {
      url: 'postgresql://localhost:5432/triplecheck_test',
      maxConnections: 10,
      connectionTimeout: 5000,
      enableQueryLogging: false,
      enableSlowQueryLogging: false,
      slowQueryThreshold: 1000,
    },
    features: {
      testFeature: {
        enabled: true,
        description: 'Test feature',
        rolloutPercentage: 100,
        enabledForUsers: [],
      },
    },
    monitoring: {
      enableHealthCheck: true,
      healthCheckPath: '/health',
      enableMetrics: false,
      metricsPath: '/metrics',
      enableTracing: false,
      tracingSampleRate: 0.1,
    },
    validation: {
      enableCaching: false,
      cacheTimeout: 300000,
      enablePreprocessing: true,
      strictMode: true,
    },
  }),
  
  /**
   * Create a mock Express request object
   */
  createMockRequest: (overrides: any = {}) => ({
    method: 'GET',
    url: '/test',
    path: '/test',
    headers: {},
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    get: (header: string) => undefined,
    ...overrides,
  }),
  
  /**
   * Create a mock Express response object
   */
  createMockResponse: () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      headersSent: false,
    };
    return res;
  },
  
  /**
   * Create a mock next function
   */
  createMockNext: () => vi.fn(),
};

// Make test utilities globally available
declare global {
  var testUtils: typeof testUtils;
}

globalThis.testUtils = testUtils;






