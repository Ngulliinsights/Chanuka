/**
 * Phase 1: Unified Test Setup
 * 
 * This setup file provides:
 * - Global test utilities available in all tests (no imports needed)
 * - Common mock data factories
 * - Test environment configuration
 * - Development helpers
 * 
 * Usage in tests (no imports required):
 * 
 *   describe('Component', () => {
 *     it('renders', () => {
 *       const user = global.testUtils.createMockUser();
 *       // test code...
 *     });
 *   });
 */

import { beforeAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'citizen' as const,
  createdAt: new Date(),
  ...overrides,
});

const createMockBill = (overrides = {}) => ({
  id: 'bill-123',
  billNumber: 'HB-1234',
  title: 'Test Bill',
  description: 'A test bill for testing',
  status: 'introduced' as const,
  introducedDate: new Date(),
  lastActionDate: new Date(),
  primarySponsorId: 'user-456',
  ...overrides,
});

const createMockSponsor = (overrides = {}) => ({
  id: 'sponsor-456',
  name: 'Test Sponsor',
  chamber: 'house' as const,
  district: '1',
  party: 'independent' as const,
  ...overrides,
});

const createMockAnalysis = (overrides = {}) => ({
  id: 'analysis-789',
  billId: 'bill-123',
  type: 'constitutional' as const,
  summary: 'Test analysis',
  findings: [],
  createdAt: new Date(),
  ...overrides,
});

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

declare global {
  var testUtils: {
    // Mock data factories
    createMockUser: typeof createMockUser;
    createMockBill: typeof createMockBill;
    createMockSponsor: typeof createMockSponsor;
    createMockAnalysis: typeof createMockAnalysis;

    // Helpers
    delay: (ms: number) => Promise<void>;
    generateUniqueId: (prefix?: string) => string;
    mockApiError: (message: string, status?: number) => Error;

    // Test patterns for validation
    testPatterns: {
      invalidIds: string[];
      xssPayloads: string[];
      sqlInjectionPayloads: string[];
      edgeCaseBoundaries: number[];
    };
  };
}

// Helper functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const generateUniqueId = (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const mockApiError = (message: string, status = 400) => {
  const error = new Error(message);
  Object.assign(error, { status, statusCode: status });
  return error;
};

// Test patterns
const testPatterns = {
  invalidIds: ['', '0', '-1', 'invalid', 'null', 'undefined'],
  xssPayloads: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror="alert(\'xss\')">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
  ],
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1; DELETE FROM users WHERE 1=1--",
  ],
  edgeCaseBoundaries: [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
};

// Assign to global scope
global.testUtils = {
  createMockUser,
  createMockBill,
  createMockSponsor,
  createMockAnalysis,
  delay,
  generateUniqueId,
  mockApiError,
  testPatterns,
};

// ============================================================================
// VITEST LIFECYCLE HOOKS
// ============================================================================

beforeAll(() => {
  // Suppress console during tests (optional)
  // global.console.log = vi.fn();
  // global.console.warn = vi.fn();
  // global.console.error = vi.fn();
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks?.();
});

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';

// Suppress specific warnings (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
