/**
 * UNIFIED SERVER UNIT TEST SETUP
 * 
 * This is the single source of truth for server unit test configuration.
 * Replaces: server/tests/setup.ts
 * 
 * Used by: server-unit test project in vitest.workspace.unified.ts
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error'

  // Suppress console logs unless debugging
  if (!process.env.DEBUG_TESTS) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    }

    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    console.info = vi.fn()
    console.debug = vi.fn()

    global.originalConsole = originalConsole
  }
})

afterAll(() => {
  // Restore console if it was mocked
  if (global.originalConsole) {
    console.log = global.originalConsole.log
    console.warn = global.originalConsole.warn
    console.error = global.originalConsole.error
    console.info = global.originalConsole.info
    console.debug = global.originalConsole.debug
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()

  // Reset global test state
  if (global.testState) {
    global.testState = {}
  }
})

afterEach(() => {
  // Test-specific cleanup (add as needed)
})

// =============================================================================
// GLOBAL TEST DATA FACTORIES
// =============================================================================

/**
 * Global test utilities and mock data factories
 */
global.testUtils = {
  // Utility: delay for async operations
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock data: standard citizen user
  mockUser: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    role: 'citizen',
    is_verified: true,
    created_at: new Date('2024-01-01'),
  },

  // Mock data: admin user
  mockAdmin: {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    first_name: 'Admin',
    last_name: 'User',
    username: 'admin',
    role: 'admin',
    is_verified: true,
    created_at: new Date('2024-01-01'),
  },

  // Mock data: legislator/sponsor
  mockSponsor: {
    id: 1,
    name: 'Hon. Test Sponsor',
    party: 'Test Party',
    constituency: 'Test Constituency',
    email: 'sponsor@parliament.gov',
    title: 'Honourable',
    is_verified: true,
  },

  // Mock data: bill
  mockBill: {
    id: 1,
    title: 'Test Bill',
    summary: 'A test bill for testing purposes',
    status: 'introduced',
    category: 'technology',
    priority: 'medium',
    introduced_date: new Date('2024-01-01'),
    sponsor_id: 1,
  },

  /**
   * Generate unique test data for isolation
   */
  generateUniqueData: () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)

    return {
      email: `test-${timestamp}-${random}@example.com`,
      name: `Test User ${timestamp}`,
      title: `Test Title ${timestamp}`,
      description: `Test description ${timestamp}`,
      timestamp,
      random,
    }
  },

  /**
   * Validate standard API response structure
   */
  validateApiResponse: (response: any, expectedStatus: number = 200) => {
    if (!response) {
      throw new Error('Response is null or undefined')
    }

    // For success responses
    if (expectedStatus >= 200 && expectedStatus < 300) {
      if (!response.success && response.success !== undefined) {
        throw new Error(`Expected success: true, got: ${response.success}`)
      }
      if (!response.data && response.data === undefined) {
        throw new Error('Expected response to have "data" property')
      }
    } else {
      // For error responses
      if (response.success === true) {
        throw new Error('Expected success: false for error response')
      }
      if (!response.error) {
        throw new Error('Expected response to have "error" property')
      }
    }
  },

  /**
   * Common test patterns and payloads
   */
  testPatterns: {
    // Invalid ID formats
    invalidIds: ['abc', '1.5', '-1', '', 'null', 'undefined', 'NaN'],

    // XSS attack payloads
    xssPayloads: [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
    ],

    // SQL injection payloads
    sqlInjectionPayloads: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "'; DELETE FROM bills; --",
      "' OR 1=1 --",
    ],

    // Edge cases
    edgeCases: {
      emptyString: '',
      veryLongString: 'x'.repeat(10000),
      specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      unicodeChars: '你好🚀🎉ñ€',
      nullByte: '\0',
    },
  },
}

// =============================================================================
// GLOBAL TEST STATE
// =============================================================================

/**
 * Global test state for sharing data between tests
 * Reset before each test in beforeEach hook above
 */
global.testState = {}

// =============================================================================
// TYPE DECLARATIONS
// =============================================================================

declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    mockUser: Record<string, any>
    mockAdmin: Record<string, any>
    mockSponsor: Record<string, any>
    mockBill: Record<string, any>
    generateUniqueData: () => Record<string, any>
    validateApiResponse: (response: any, expectedStatus?: number) => void
    testPatterns: {
      invalidIds: string[]
      xssPayloads: string[]
      sqlInjectionPayloads: string[]
      edgeCases: Record<string, string | number>
    }
  }

  var testState: Record<string, any>

  var originalConsole: {
    log: typeof console.log
    warn: typeof console.warn
    error: typeof console.error
    info: typeof console.info
    debug: typeof console.debug
  }
}
