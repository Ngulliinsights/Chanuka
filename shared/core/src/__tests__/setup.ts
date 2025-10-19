/**
 * Test Setup Configuration
 * 
 * This file provides global test configuration, environment setup, and utility functions
 * for the test suite. It runs before all tests to ensure a consistent testing environment.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

/**
 * Global Test Setup
 * 
 * This section initializes the test environment by setting up environment variables
 * and creating mock objects that will be used across all tests. Running this once
 * before all tests improves performance and ensures consistency.
 */
beforeAll(() => {
  // Configure environment variables for the test environment
  // These override any existing environment variables to ensure tests run in isolation
  const testEnvVars = {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    SESSION_SECRET: 'test-session-secret-key-for-testing',
    DATABASE_URL: 'postgresql://localhost:5432/chanuka_test',
    REDIS_URL: 'redis://localhost:6379/1',
    LOG_LEVEL: 'error', // Minimize logging output during tests
    CACHE_PROVIDER: 'memory', // Use in-memory cache to avoid external dependencies
    RATE_LIMIT_PROVIDER: 'memory', // Use in-memory rate limiting for speed
  };

  Object.entries(testEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Initialize the global mock logger
  // This comprehensive mock prevents logging errors and captures log calls for assertions
  (global as any).logger = createMockLogger();
  (global as any).loggingService = (global as any).logger;
});

/**
 * Global Test Teardown
 * 
 * Runs after all tests complete to clean up any resources or connections
 * that were created during the test suite execution.
 */
afterAll(async () => {
  // Clear all timers to prevent memory leaks
  vi.clearAllTimers();
  
  // Reset all mocks to their initial state
  vi.resetAllMocks();
  
  // Additional cleanup can be added here as needed
  // For example: closing database connections, clearing file uploads, etc.
});

/**
 * Before Each Test Setup
 * 
 * Runs before each individual test to ensure a clean slate. This prevents
 * test pollution where one test's state affects another test's behavior.
 */
beforeEach(() => {
  // Clear all mock function call histories without resetting implementations
  vi.clearAllMocks();
  
  // Reset time-related mocks if you're using fake timers
  // vi.useFakeTimers();
});

/**
 * After Each Test Cleanup
 * 
 * Runs after each individual test to clean up test-specific resources
 * and restore any modified global state.
 */
afterEach(() => {
  // Restore real timers if fake timers were used
  // vi.useRealTimers();
  
  // Additional per-test cleanup can be added here
});

/**
 * Creates a comprehensive mock logger instance
 * 
 * This function generates a mock logger that implements all methods your application
 * might use. The mock prevents actual logging during tests while allowing you to
 * verify that logging was called when needed.
 */
function createMockLogger() {
  const mockLogger: any = {
    // EventEmitter interface methods
    // These allow the logger to behave like a Node.js EventEmitter
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnValue(true),
    addListener: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
    listeners: vi.fn(() => []),
    listenerCount: vi.fn(() => 0),
    eventNames: vi.fn(() => []),
    once: vi.fn().mockReturnThis(),
    prependListener: vi.fn().mockReturnThis(),
    prependOnceListener: vi.fn().mockReturnThis(),

    // Standard logging level methods
    // Each method is mocked and returns the logger for chaining
    info: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    error: vi.fn().mockReturnThis(),
    debug: vi.fn().mockReturnThis(),
    trace: vi.fn().mockReturnThis(),
    fatal: vi.fn().mockReturnThis(),
    critical: vi.fn().mockReturnThis(),
    log: vi.fn().mockReturnThis(),

    // Logger instance management
    // Allows creating child loggers with additional context
    child: vi.fn(function() { return mockLogger; }),
    setLevel: vi.fn().mockReturnThis(),
    withContext: vi.fn(function() { return mockLogger; }),
    getContext: vi.fn(() => ({})),

    // Specialized logging methods for different domains
    // These capture domain-specific logging without producing output
    logRequest: vi.fn().mockReturnThis(),
    logDatabaseQuery: vi.fn().mockReturnThis(),
    logCacheOperation: vi.fn().mockReturnThis(),
    logSecurityEvent: vi.fn().mockReturnThis(),
    logBusinessEvent: vi.fn().mockReturnThis(),
    logPerformance: vi.fn().mockReturnThis(),

    // Performance timing utilities
    // These help track operation duration in tests
    startTimer: vi.fn(() => Date.now()),
    endTimer: vi.fn(() => 0),
    measure: vi.fn((name: string, fn: () => any) => fn()),
    measureAsync: vi.fn(async (name: string, fn: () => Promise<any>) => await fn()),

    // Error tracking integration
    setErrorTracker: vi.fn().mockReturnThis(),

    // Log querying methods for retrieving historical logs
    queryLogs: vi.fn(() => []),
    getLogsByCorrelation: vi.fn(() => []),
    getLogAggregation: vi.fn(() => ({})),

    // Log management utilities
    clearLogs: vi.fn().mockReturnThis(),
    getLogCount: vi.fn(() => 0),
    exportLogs: vi.fn(() => ''),

    // Configuration and control methods
    getLevel: vi.fn(() => 'error'),
    flush: vi.fn(async () => undefined),

    // Metrics collection
    getMetrics: vi.fn(() => ({
      totalLogs: 0,
      byLevel: {},
      byContext: {},
    })),
    resetMetrics: vi.fn().mockReturnThis(),

    // Health and status checks
    cleanup: vi.fn(async () => undefined),
    isEnabled: vi.fn(() => true),
    isHealthy: vi.fn(() => true),
  };

  return mockLogger;
}

/**
 * Test Utility Functions
 * 
 * These helper functions make it easier to write tests by providing common
 * functionality like waiting, creating mock objects, and generating test data.
 */
export const testUtils = {
  /**
   * Waits for a specified duration in milliseconds
   * 
   * Useful for testing time-dependent behavior or waiting for async operations.
   * Consider using vi.useFakeTimers() and vi.advanceTimersByTime() for faster tests.
   * 
   * @param ms - Number of milliseconds to wait
   * @returns Promise that resolves after the specified time
   */
  wait: (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Creates a complete mock configuration object for testing
   * 
   * This configuration mirrors your production configuration structure but uses
   * test-appropriate values. Modify this as your configuration schema evolves.
   * 
   * @returns A complete mock configuration object
   */
  createMockConfig: () => ({
    app: {
      name: 'chanuka',
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
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      enableVirusScanning: false,
      compressionQuality: 85,
    },
    database: {
      url: 'postgresql://localhost:5432/chanuka_test',
      maxConnections: 10,
      connectionTimeout: 5000,
      enableQueryLogging: false,
      enableSlowQueryLogging: false,
      slowQueryThreshold: 1000,
    },
    features: {
      testFeature: {
        enabled: true,
        description: 'Test feature flag',
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
   * Creates a mock Express request object
   * 
   * This simulates an HTTP request for testing middleware and route handlers.
   * You can override any properties to simulate different request scenarios.
   * 
   * @param overrides - Properties to override in the mock request
   * @returns A mock Express request object
   */
  createMockRequest: (overrides: Partial<any> = {}) => {
    const req: any = {
      method: 'GET',
      url: '/test',
      path: '/test',
      headers: {},
      query: {},
      params: {},
      body: {},
      ip: '127.0.0.1',
      protocol: 'http',
      secure: false,
      xhr: false,
      cookies: {},
      signedCookies: {},
      
      // Mock the get() method to retrieve headers
      get: vi.fn((header: string) => {
        return req.headers[header.toLowerCase()];
      }),
      
      // Mock the header() method (alias for get)
      header: vi.fn((header: string) => {
        return req.headers[header.toLowerCase()];
      }),
      
      ...overrides,
    };
    
    return req;
  },
  
  /**
   * Creates a mock Express response object
   * 
   * This simulates an HTTP response for testing route handlers. All methods
   * return the response object itself to support method chaining.
   * 
   * @returns A mock Express response object with spy functions
   */
  createMockResponse: () => {
    const res: any = {
      statusCode: 200,
      headersSent: false,
      locals: {},
      
      // Mock response methods with chaining support
      status: vi.fn(function(code: number) {
        res.statusCode = code;
        return res;
      }),
      
      json: vi.fn(function(data: any) {
        res.headersSent = true;
        return res;
      }),
      
      send: vi.fn(function(data: any) {
        res.headersSent = true;
        return res;
      }),
      
      sendStatus: vi.fn(function(code: number) {
        res.statusCode = code;
        res.headersSent = true;
        return res;
      }),
      
      set: vi.fn(function(field: string | object, value?: string) {
        return res;
      }),
      
      setHeader: vi.fn(function(name: string, value: string) {
        return res;
      }),
      
      end: vi.fn(function() {
        res.headersSent = true;
        return res;
      }),
      
      redirect: vi.fn(function(url: string) {
        res.headersSent = true;
        return res;
      }),
      
      cookie: vi.fn(function(name: string, value: string, options?: any) {
        return res;
      }),
      
      clearCookie: vi.fn(function(name: string, options?: any) {
        return res;
      }),
    };
    
    return res;
  },

  /**
   * Creates a mock Express next function
   * 
   * This simulates the next() function in Express middleware. You can use
   * vi.mocked(next) to assert whether next was called and with what arguments.
   * 
   * @returns A mock next function
   */
  createMockNext: () => vi.fn(),

  /**
   * Creates a mock user object for authentication testing
   * 
   * Generates a realistic user object that can be used in tests requiring
   * authenticated users.
   * 
   * @param overrides - Properties to override in the mock user
   * @returns A mock user object
   */
  createMockUser: (overrides: Partial<any> = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Creates a mock JWT token payload
   * 
   * Generates a token payload structure for testing authentication logic.
   * 
   * @param overrides - Properties to override in the mock payload
   * @returns A mock JWT payload object
   */
  createMockTokenPayload: (overrides: Partial<any> = {}) => ({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }),
};

type TestUtilsType = typeof testUtils;

/**
 * TypeScript Global Declarations
 * 
 * These declarations make the test utilities and mock objects available
 * throughout your test files without needing to import them explicitly.
 */
declare global {
  var testUtils: TestUtilsType;
  var logger: any;
  var loggingService: any;
}

// Make test utilities globally accessible
global.testUtils = testUtils;




































