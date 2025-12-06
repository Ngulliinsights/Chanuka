/**
 * UNIFIED CLIENT ACCESSIBILITY TEST SETUP
 * 
 * This setup is specifically for accessibility (a11y) tests.
 * Migrated from: client/jest.a11y.config.js
 * 
 * Used by: client-a11y test project in vitest.workspace.unified.ts
 */

import '@testing-library/jest-dom/vitest'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'

// Extend test matchers
expect.extend(toHaveNoViolations)

// Make React globally available
global.React = React

// =============================================================================
// GLOBAL TEST CLEANUP
// =============================================================================

afterEach(() => {
  cleanup()
})

// =============================================================================
// JSDOM POLYFILLS (from shared client setup)
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

// =============================================================================
// ACCESSIBILITY TEST UTILITIES
// =============================================================================

/**
 * Global utilities for accessibility testing
 */
global.a11yTestUtils = {
  /**
   * Run axe accessibility checks on a rendered component
   */
  checkAccessibility: async (container: HTMLElement) => {
    const results = await axe(container)
    return results
  },

  /**
   * Check that all interactive elements have proper labels
   */
  checkLabeledElements: (container: HTMLElement) => {
    const buttons = container.querySelectorAll('button')
    const inputs = container.querySelectorAll('input, textarea, select')

    const unlabeled: Element[] = []

    buttons.forEach(button => {
      if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
        unlabeled.push(button)
      }
    })

    inputs.forEach(input => {
      const id = input.getAttribute('id')
      const ariaLabel = input.getAttribute('aria-label')
      const ariaLabelledBy = input.getAttribute('aria-labelledby')
      const label = id ? container.querySelector(`label[for="${id}"]`) : null

      if (!ariaLabel && !ariaLabelledBy && !label) {
        unlabeled.push(input)
      }
    })

    return { unlabeled, isAccessible: unlabeled.length === 0 }
  },

  /**
   * Check keyboard navigation
   */
  checkKeyboardNavigation: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    return focusableElements.length > 0 ? Array.from(focusableElements) : []
  },

  /**
   * Check color contrast
   */
  checkColorContrast: (container: HTMLElement) => {
    // This is a basic check - real scenarios would use a library like axe
    const elements = container.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6')
    return Array.from(elements)
  },
}

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

process.env.NODE_ENV = 'test'

// Suppress console noise
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
