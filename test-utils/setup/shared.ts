/**
 * UNIFIED SHARED LIBRARIES TEST SETUP
 * 
 * Configuration for testing shared/core utilities and validation libraries.
 * 
 * Used by: shared test project in vitest.workspace.unified.ts
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error'

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
  if (global.originalConsole) {
    console.log = global.originalConsole.log
    console.warn = global.originalConsole.warn
    console.error = global.originalConsole.error
    console.info = global.originalConsole.info
    console.debug = global.originalConsole.debug
  }

  if (global.gc) {
    global.gc()
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  if (global.testState) {
    global.testState = {}
  }
})

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

/**
 * Global utilities for shared library testing
 */
global.testUtils = {
  /**
   * Delay utility
   */
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate test data
   */
  generateUniqueData: () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return {
      timestamp,
      random,
      id: `test-${timestamp}-${random}`,
    }
  },

  /**
   * Test payloads for validation
   */
  testPatterns: {
    // Valid email formats
    validEmails: [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
    ],

    // Invalid email formats
    invalidEmails: [
      'invalid',
      '@example.com',
      'user@',
      'user @example.com',
      'user@example',
    ],

    // Valid URLs
    validUrls: [
      'https://example.com',
      'http://localhost:3000',
      'https://sub.example.com/path',
    ],

    // Invalid URLs
    invalidUrls: [
      'not-a-url',
      'http://',
      'ht!tp://example.com',
    ],

    // Valid phone numbers
    validPhones: [
      '1234567890',
      '+1-234-567-8900',
      '+44 20 7946 0958',
    ],

    // Invalid phone numbers
    invalidPhones: [
      'abc',
      '123',
      'not-a-number',
    ],

    // Valid UUIDs
    validUUIDs: [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ],

    // Invalid UUIDs
    invalidUUIDs: [
      'not-a-uuid',
      '550e8400-e29b-41d4-a716',
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    ],

    // XSS payloads
    xssPayloads: [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
    ],

    // SQL injection payloads
    sqlInjectionPayloads: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
    ],

    // Edge cases
    edgeCases: {
      emptyString: '',
      veryLongString: 'x'.repeat(10000),
      nullValue: null,
      undefinedValue: undefined,
      zeroValue: 0,
      falseValue: false,
      emptyArray: [],
      emptyObject: {},
    },
  },
}

// =============================================================================
// GLOBAL STATE
// =============================================================================

global.testState = {}

declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    generateUniqueData: () => Record<string, any>
    testPatterns: {
      validEmails: string[]
      invalidEmails: string[]
      validUrls: string[]
      invalidUrls: string[]
      validPhones: string[]
      invalidPhones: string[]
      validUUIDs: string[]
      invalidUUIDs: string[]
      xssPayloads: string[]
      sqlInjectionPayloads: string[]
      edgeCases: Record<string, any>
    }
  }
  var testState: Record<string, any>
  var originalConsole: Record<string, any>
}
