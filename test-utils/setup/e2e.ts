/**
 * UNIFIED E2E TEST SETUP (Playwright)
 * 
 * Configuration for end-to-end tests.
 * 
 * Used by: e2e test project in vitest.workspace.unified.ts
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'
  process.env.E2E_TIMEOUT = process.env.E2E_TIMEOUT || '30000'

  if (!process.env.DEBUG_TESTS) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    }

    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()

    global.originalConsole = originalConsole
  }
})

afterAll(() => {
  if (global.originalConsole) {
    console.log = global.originalConsole.log
    console.warn = global.originalConsole.warn
    console.error = global.originalConsole.error
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// E2E TEST UTILITIES
// =============================================================================

/**
 * Global utilities for E2E tests
 */
global.e2eTestUtils = {
  /**
   * Wait for element to be visible
   */
  waitForElement: async (selector: string, timeout = 5000) => {
    // This would be implemented in actual Playwright tests
    // using page.waitForSelector() or similar
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      // Check element existence
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  },

  /**
   * Fill form field
   */
  fillField: async (selector: string, value: string) => {
    // Implementation in actual tests
    // await page.fill(selector, value)
  },

  /**
   * Click element
   */
  clickElement: async (selector: string) => {
    // Implementation in actual tests
    // await page.click(selector)
  },

  /**
   * Submit form
   */
  submitForm: async (formSelector: string) => {
    // Implementation in actual tests
    // await page.click(`${formSelector} button[type="submit"]`)
  },

  /**
   * Login helper
   */
  login: async (email: string, password: string) => {
    // Implementation in actual tests
    // await page.goto('/login')
    // await page.fill('input[name="email"]', email)
    // await page.fill('input[name="password"]', password)
    // await page.click('button[type="submit"]')
    // await page.waitForNavigation()
  },

  /**
   * Logout helper
   */
  logout: async () => {
    // Implementation in actual tests
    // await page.click('[data-testid="logout-btn"]')
    // await page.waitForNavigation()
  },

  /**
   * Check element visibility
   */
  isElementVisible: async (selector: string) => {
    // Implementation in actual tests
    // const element = await page.$(selector)
    // return element !== null
  },

  /**
   * Get text content
   */
  getElementText: async (selector: string) => {
    // Implementation in actual tests
    // return await page.textContent(selector)
  },

  /**
   * Wait for navigation
   */
  waitForNavigation: async (timeout = 5000) => {
    // Implementation in actual tests
    // await page.waitForNavigation()
  },

  /**
   * Take screenshot for visual regression testing
   */
  takeScreenshot: async (name: string) => {
    // Implementation in actual tests
    // await page.screenshot({ path: `./screenshots/${name}.png` })
  },

  /**
   * Check accessibility
   */
  checkAccessibility: async () => {
    // Implementation in actual tests using @axe-core/playwright
    // const violations = await checkA11y(page)
    // return violations
  },
}

// =============================================================================
// TEST DATA
// =============================================================================

global.e2eTestData = {
  // Standard test user for login tests
  testUser: {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    name: 'E2E Test User',
  },

  // Admin user for admin tests
  adminUser: {
    email: 'e2e-admin@example.com',
    password: 'AdminPassword123!',
    name: 'E2E Admin User',
  },

  // Test data for form submissions
  testBill: {
    title: 'E2E Test Bill',
    summary: 'A bill created during E2E testing',
    category: 'healthcare',
    description: 'This is a test bill for E2E testing purposes.',
  },

  // Common selectors
  selectors: {
    loginForm: '[data-testid="login-form"]',
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    logoutButton: '[data-testid="logout-btn"]',
    mainNav: '[data-testid="main-nav"]',
  },
}

// =============================================================================
// GLOBAL STATE
// =============================================================================

global.e2eState = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.E2E_TIMEOUT || '30000'),
}

declare global {
  var e2eTestUtils: {
    waitForElement: (selector: string, timeout?: number) => Promise<void>
    fillField: (selector: string, value: string) => Promise<void>
    clickElement: (selector: string) => Promise<void>
    submitForm: (formSelector: string) => Promise<void>
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isElementVisible: (selector: string) => Promise<boolean>
    getElementText: (selector: string) => Promise<string | null>
    waitForNavigation: (timeout?: number) => Promise<void>
    takeScreenshot: (name: string) => Promise<void>
    checkAccessibility: () => Promise<any>
  }

  var e2eTestData: {
    testUser: Record<string, string>
    adminUser: Record<string, string>
    testBill: Record<string, string>
    selectors: Record<string, string>
  }

  var e2eState: {
    baseUrl: string
    timeout: number
  }

  var originalConsole: Record<string, any>
}
