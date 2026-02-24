// =============================================================================
// VITEST SETUP FILE
// Configures Vitest for React Testing Library with jsdom environment
// =============================================================================

import '@testing-library/vitest-dom/vitest';
import { cleanup } from '@testing-library/react';
import * as React from 'react';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Ensure React is available globally for hooks
global.React = React;

// =============================================================================
// vitest-DOM MATCHERS
// =============================================================================

// DOM matchers are automatically extended with '@testing-library/vitest-dom/vitest'

// =============================================================================
// GLOBAL TEST CLEANUP
// =============================================================================

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// =============================================================================
// JSDOM POLYFILLS
// =============================================================================

// Polyfill for ResizeObserver (used by some UI libraries)
global.ResizeObserver = class ResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  cb: ResizeObserverCallback;
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(() => []),
}));

// Polyfill for matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill for requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  const id = setTimeout(cb, 16);
  return id as any;
});
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id as any));

// Polyfill for performance.mark and performance.measure
if (!global.performance.mark) {
  global.performance.mark = vi.fn();
}
if (!global.performance.measure) {
  global.performance.measure = vi.fn();
}

// Polyfill for crypto.randomUUID
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  } as any;
}

// Polyfill for URL.createObjectURL and URL.revokeObjectURL
if (!global.URL) {
  global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  } as any;
}

// Skip clipboard polyfill - let user-event handle it

// Polyfill for navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) => success({
      coords: {
        latitude: 0,
        longitude: 0,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })),
    watchPosition: vi.fn(() => 1),
    clearWatch: vi.fn(),
  },
  writable: true,
});

// Polyfill for localStorage and sessionStorage
const createMockStorage = () => {
  let storage: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createMockStorage(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: createMockStorage(),
  writable: true,
});

// Enhanced IndexedDB mock for offline functionality
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: vi.fn(() => ({
          createIndex: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
        })),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
            getAll: vi.fn(),
          })),
        })),
        close: vi.fn(),
      },
    })),
    deleteDatabase: vi.fn(),
    cmp: vi.fn(),
  },
  writable: true,
});

// Mock IDBDatabase interface
Object.defineProperty(window, 'IDBDatabase', {
  value: class IDBDatabase {},
  writable: true,
});

// Mock IDBObjectStore interface
Object.defineProperty(window, 'IDBObjectStore', {
  value: class IDBObjectStore {},
  writable: true,
});

// Mock IDBTransaction interface
Object.defineProperty(window, 'IDBTransaction', {
  value: class IDBTransaction {},
  writable: true,
});

// Mock IDBRequest interface
Object.defineProperty(window, 'IDBRequest', {
  value: class IDBRequest {},
  writable: true,
});

// =============================================================================
// GLOBAL MOCK CONFIGURATIONS
// =============================================================================

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

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
})) as any;

Object.defineProperty(global.WebSocket, 'CONNECTING', { value: 0 });
Object.defineProperty(global.WebSocket, 'OPEN', { value: 1 });
Object.defineProperty(global.WebSocket, 'CLOSING', { value: 2 });
Object.defineProperty(global.WebSocket, 'CLOSED', { value: 3 });

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
}));

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

Object.defineProperty(window.Notification, 'permission', {
  value: 'default',
  writable: true,
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: vi.fn().mockResolvedValue('granted'),
  writable: true,
});

// Mock Service Worker API
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({
      active: { state: 'activated' },
      waiting: null,
      installing: null,
    }),
    ready: Promise.resolve({
      active: { state: 'activated' },
      waiting: null,
      installing: null,
    }),
    getRegistrations: vi.fn().mockResolvedValue([]),
    getRegistration: vi.fn().mockResolvedValue(null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

// Global test utilities available in all test files
global.testUtils = {
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

  // Wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

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
};

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:3001/api';

// Ensure jsdom is properly configured
if (typeof window !== 'undefined') {
  // Set up base URL for jsdom
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  });
}