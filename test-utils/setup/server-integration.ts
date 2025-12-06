/**
 * UNIFIED SERVER INTEGRATION TEST SETUP
 * 
 * Specialized setup for integration tests with real/mock database interactions.
 * 
 * Used by: server-integration test project in vitest.workspace.unified.ts
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// =============================================================================
// DATABASE SETUP
// =============================================================================

/**
 * For integration tests, you would typically:
 * 1. Start a test database (PostgreSQL, SQLite, etc.)
 * 2. Run migrations
 * 3. Seed test data
 * 
 * Example:
 */
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'
  process.env.LOG_LEVEL = 'error'

  // Initialize test database connection
  // Example:
  // await initializeTestDatabase()
  // await runMigrations()
  // await seedTestData()

  // Suppress logs
  if (!process.env.DEBUG_TESTS) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    }

    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    console.info = vi.fn()

    global.originalConsole = originalConsole
  }
})

afterAll(async () => {
  // Restore console
  if (global.originalConsole) {
    console.log = global.originalConsole.log
    console.warn = global.originalConsole.warn
    console.error = global.originalConsole.error
    console.info = global.originalConsole.info
  }

  // Clean up database connections
  // Example:
  // await cleanupTestDatabase()
  // await closeConnections()

  if (global.gc) {
    global.gc()
  }
})

beforeEach(() => {
  vi.clearAllMocks()

  if (global.testState) {
    global.testState = {}
  }

  // Reset database to clean state
  // Example:
  // await truncateTestTables()
  // await seedTestData()
})

afterEach(() => {
  // Clean up after each test
})

// =============================================================================
// MOCK SERVICE SETUP
// =============================================================================

/**
 * Integration tests often need to mock external services
 */
global.integrationTestUtils = {
  /**
   * Wait for async operations to complete
   */
  waitForAsync: async (timeout = 5000) => {
    await new Promise(resolve => setTimeout(resolve, 100))
  },

  /**
   * Create a test transaction
   */
  createTestTransaction: async () => {
    // Example: return database transaction
    return {
      commit: vi.fn(),
      rollback: vi.fn(),
    }
  },

  /**
   * Seed test data in database
   */
  seedTestData: async (data: any) => {
    // Example: insert data into test database
    // await database.insert(data)
  },

  /**
   * Clean test data from database
   */
  cleanTestData: async (table: string) => {
    // Example: delete from database
    // await database.truncate(table)
  },
}

// =============================================================================
// GLOBAL TEST DATA
// =============================================================================

global.testUtils = {
  // Utility: delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock user data
  mockUser: {
    id: 1,
    email: 'integration-test@example.com',
    name: 'Integration Test User',
    first_name: 'Integration',
    last_name: 'Test',
    username: 'integrationtest',
    role: 'citizen',
    is_verified: true,
    created_at: new Date('2024-01-01'),
  },

  // Mock admin
  mockAdmin: {
    id: 2,
    email: 'admin-integration@example.com',
    name: 'Integration Admin',
    first_name: 'Integration',
    last_name: 'Admin',
    username: 'adminint',
    role: 'admin',
    is_verified: true,
    created_at: new Date('2024-01-01'),
  },

  // Mock sponsor
  mockSponsor: {
    id: 1,
    name: 'Hon. Integration Sponsor',
    party: 'Test Party',
    constituency: 'Test Constituency',
    email: 'sponsor-int@parliament.gov',
    title: 'Honourable',
    is_verified: true,
  },

  // Mock bill
  mockBill: {
    id: 1,
    title: 'Integration Test Bill',
    summary: 'A bill for integration testing',
    status: 'introduced',
    category: 'technology',
    priority: 'medium',
    introduced_date: new Date('2024-01-01'),
    sponsor_id: 1,
  },

  /**
   * Generate unique data for test isolation
   */
  generateUniqueData: () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)

    return {
      email: `integration-test-${timestamp}-${random}@example.com`,
      name: `Integration Test ${timestamp}`,
      title: `Integration Test Title ${timestamp}`,
      username: `inttest${timestamp}`,
      timestamp,
      random,
    }
  },

  /**
   * Validate API response
   */
  validateApiResponse: (response: any, expectedStatus: number = 200) => {
    if (expectedStatus >= 200 && expectedStatus < 300) {
      if (response.success === false) {
        throw new Error(`Expected success response, got: ${JSON.stringify(response)}`)
      }
    } else {
      if (response.success === true) {
        throw new Error(`Expected error response, got: ${JSON.stringify(response)}`)
      }
    }
  },

  /**
   * Test patterns for integration tests
   */
  testPatterns: {
    invalidIds: ['abc', '1.5', '-1', '', 'null', 'undefined'],
    xssPayloads: [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
    ],
    sqlInjectionPayloads: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
    ],
    edgeCases: {
      emptyString: '',
      veryLongString: 'x'.repeat(10000),
      specialChars: '!@#$%^&*()',
      unicodeChars: '你好🚀',
    },
  },
}

// =============================================================================
// GLOBAL STATE
// =============================================================================

global.testState = {}

declare global {
  var integrationTestUtils: {
    waitForAsync: (timeout?: number) => Promise<void>
    createTestTransaction: () => Promise<any>
    seedTestData: (data: any) => Promise<void>
    cleanTestData: (table: string) => Promise<void>
  }

  var testUtils: Record<string, any>
  var testState: Record<string, any>
  var originalConsole: Record<string, any>
}
