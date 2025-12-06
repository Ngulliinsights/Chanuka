/**
 * UNIFIED CLIENT INTEGRATION TEST SETUP
 * 
 * This is the single source of truth for client integration test configuration.
 * Replaces: client/src/test-utils/setup-integration.ts
 * 
 * Used by: client-integration test project in vitest.workspace.unified.ts
 */

import '@testing-library/jest-dom/vitest'
import { expect, afterEach, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import * as React from 'react'

// Ensure React is available globally
global.React = React

// =============================================================================
// MOCK SERVICE WORKER SETUP
// =============================================================================

/**
 * Create MSW server for API mocking in integration tests.
 * Provides consistent mock responses for all API endpoints.
 */
export const server = setupServer(
  // Default bills API endpoints
  http.get('/api/bills', ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'

    return HttpResponse.json({
      data: Array.from({ length: parseInt(limit) }, (_, i) => ({
        id: `bill-${parseInt(page) * 10 + i}`,
        title: `Test Bill ${parseInt(page) * 10 + i}`,
        summary: 'A test bill for integration testing',
        status: 'active',
        category: 'healthcare',
        sponsor: 'Test Sponsor',
        introduced_date: new Date().toISOString(),
        last_action_date: new Date().toISOString(),
        votes: { yes: 45, no: 30, abstain: 5 },
        tags: ['test', 'integration'],
        urgency_level: 'medium',
        constitutional_flags: [],
        engagement_metrics: {
          views: 100,
          saves: 10,
          comments: 5,
          shares: 2,
        },
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 100,
        totalPages: 10,
      },
    })
  }),

  http.get('/api/bills/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      title: `Test Bill ${id}`,
      summary: 'Detailed test bill for integration testing',
      fullText: 'This is the full text of the test bill...',
      status: 'active',
      category: 'healthcare',
      sponsor: 'Test Sponsor',
      introduced_date: new Date().toISOString(),
      last_action_date: new Date().toISOString(),
      votes: { yes: 45, no: 30, abstain: 5 },
      tags: ['test', 'integration'],
      urgency_level: 'medium',
      constitutional_flags: [],
      engagement_metrics: {
        views: 100,
        saves: 10,
        comments: 5,
        shares: 2,
      },
      analysis: {
        constitutional_analysis: 'No constitutional concerns identified',
        expert_opinions: [],
        community_sentiment: 0.7,
      },
    })
  }),

  // Users API
  http.get('/api/users/me', () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      is_verified: true,
    })
  }),

  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'test@example.com') {
      return HttpResponse.json({
        access_token: 'mock-jwt-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),
)

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up after all tests
afterAll(() => server.close())

// =============================================================================
// JSDOM POLYFILLS (shared with unit tests)
// =============================================================================

global.ResizeObserver = class ResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  cb: ResizeObserverCallback
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(() => []),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

global.requestAnimationFrame = vi.fn((cb) => {
  const id = setTimeout(cb, 16)
  return id as any
})
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id as any))

if (!global.performance.mark) {
  global.performance.mark = vi.fn()
}
if (!global.performance.measure) {
  global.performance.measure = vi.fn()
}

if (!global.crypto) {
  global.crypto = {
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    }),
  } as any
}

const createMockStorage = () => {
  let storage: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      storage = {}
    }),
    get length() {
      return Object.keys(storage).length
    },
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createMockStorage(),
  writable: true,
})

Object.defineProperty(window, 'sessionStorage', {
  value: createMockStorage(),
  writable: true,
})

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
})

// =============================================================================
// INTEGRATION TEST UTILITIES
// =============================================================================

/**
 * Global utilities for integration tests
 */
global.integrationTestUtils = {
  /**
   * Mock an API error response
   */
  mockApiError: (endpoint: string, status = 500, message = 'Server Error') => {
    server.use(
      http.all(endpoint, () => {
        return HttpResponse.json({ error: message }, { status })
      })
    )
  },

  /**
   * Mock an authenticated user
   */
  mockAuthenticatedUser: (user = {}) => {
    const defaultUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      is_verified: true,
    }
    const mockUser = { ...defaultUser, ...user }

    server.use(
      http.get('/api/users/me', () => HttpResponse.json(mockUser))
    )

    return mockUser
  },

  /**
   * Mock unauthenticated user (401 response)
   */
  mockUnauthenticatedUser: () => {
    server.use(
      http.get('/api/users/me', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    )
  },

  /**
   * Wait for API calls to complete
   */
  waitForApiCalls: async (timeout = 5000) => {
    // This is a placeholder - in real scenarios you'd track network requests
    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  },

  /**
   * Simulate slow network conditions
   */
  simulateSlowNetwork: () => {
    server.use(
      http.all('*', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return HttpResponse.json({})
      })
    )
  },

  /**
   * Simulate offline mode
   */
  simulateOfflineMode: () => {
    server.use(
      http.all('*', () => {
        return HttpResponse.error()
      })
    )
  },

  /**
   * Reset network conditions to normal
   */
  resetNetworkConditions: () => {
    server.resetHandlers()
  },
}

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

process.env.NODE_ENV = 'test'
process.env.VITE_API_URL = 'http://localhost:3001/api'

if (typeof window !== 'undefined') {
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
  })
}

// Suppress console noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})
