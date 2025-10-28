import { beforeAll, afterAll, beforeEach, afterEach, jest, expect } from '@jest/globals';
import { logger } from '@shared/core';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
  
  // Suppress console logs during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Store original console methods for debugging
    global.originalConsole = originalConsole;
  }

  // Set test timeouts
  jest.setTimeout(30000); // 30 seconds for integration tests
});

afterAll(async () => {
  // Restore console if it was mocked
  if (global.originalConsole) {
    console.log = global.originalConsole.log;
    console.warn = global.originalConsole.warn;
    console.error = global.originalConsole.error;
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks();
  
  // Reset any global state
  if (global.testState) {
    global.testState = {};
  }
});

afterEach(() => {
  // Cleanup after each test
  // Any test-specific cleanup would go here
});

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock user for authentication tests
  mockUser: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: 'citizen'
  },
  
  // Mock admin user
  mockAdmin: {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },

  // Mock sponsor data
  mockSponsor: {
    id: 1,
    name: 'Hon. Test Sponsor',
    party: 'Test Party',
    constituency: 'Test Constituency',
    email: 'sponsor@parliament.gov'
  },

  // Mock bill data
  mockBill: {
    id: 1,
    title: 'Test Bill',
    summary: 'A test bill for testing purposes',
    status: 'introduced',
    category: 'technology',
    priority: 'medium'
  },

  // Generate unique test data
  generateUniqueData: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      email: `test-${timestamp}-${random}@example.com`,
      name: `Test User ${timestamp}`,
      title: `Test Title ${timestamp}`,
      description: `Test description ${timestamp}`,
      timestamp,
      random
    };
  },

  // Validate response structure
  validateApiResponse: (response: any, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    
    if (expectedStatus >= 200 && expectedStatus < 300) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
    } else {
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    }
  },

  // Common test patterns
  testPatterns: {
    // Test invalid ID formats
    invalidIds: ['abc', '1.5', '-1', '', 'null', 'undefined'],
    
    // Test XSS payloads
    xssPayloads: [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>'
    ],
    
    // Test SQL injection payloads
    sqlInjectionPayloads: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "'; DELETE FROM bills; --"
    ],
    
    // Test long strings
    longString: 'x'.repeat(10000),
    
    // Test special characters
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }
};

// Global test state for sharing data between tests
global.testState = {};

// Enhanced type declarations
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    mockUser: any;
    mockAdmin: any;
    mockSponsor: any;
    mockBill: any;
    generateUniqueData: () => any;
    validateApiResponse: (response: any, expectedStatus?: number) => void;
    testPatterns: {
      invalidIds: string[];
      xssPayloads: string[];
      sqlInjectionPayloads: string[];
      longString: string;
      specialChars: string;
    };
  };
  
  var testState: Record<string, any>;
  
  var originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  };
}












































