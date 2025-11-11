/**
 * Comprehensive Test Configuration for Chanuka Client UI
 * 
 * This file provides centralized configuration for all testing types:
 * - Unit tests
 * - Integration tests
 * - Performance tests
 * - E2E tests
 * - Visual regression tests
 * - Accessibility tests
 */

import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vitest/config';

// Test coverage thresholds (80%+ requirement)
export const coverageThresholds = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
};

// Performance test thresholds (Core Web Vitals)
export const performanceThresholds = {
  LCP: 2500, // Largest Contentful Paint < 2.5s
  FID: 100,  // First Input Delay < 100ms
  CLS: 0.1,  // Cumulative Layout Shift < 0.1
  TTFB: 800, // Time to First Byte < 800ms
  FCP: 1800, // First Contentful Paint < 1.8s
};

// Accessibility test configuration
export const accessibilityConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'semantic-html': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-roles': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  level: 'AA',
};

// Visual regression test configuration
export const visualRegressionConfig = {
  threshold: 0.2, // 20% difference threshold
  browsers: ['chromium', 'firefox', 'webkit'],
  viewports: [
    { width: 320, height: 568 },  // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1024, height: 768 }, // Desktop
    { width: 1920, height: 1080 }, // Large Desktop
  ],
};

// E2E test configuration
export const e2eConfig = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
  workers: 4,
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
};

// Integration test configuration
export const integrationConfig = {
  timeout: 15000,
  retries: 1,
  setupTimeout: 30000,
  teardownTimeout: 10000,
};

// Unit test configuration
export const unitTestConfig: UserConfig = {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    css: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.d.ts',
        'dist/',
        'coverage/',
      ],
      thresholds: {
        global: coverageThresholds,
      },
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
      },
    },
  },
};

// Test file patterns
export const testPatterns = {
  unit: 'src/**/*.{test,spec}.{ts,tsx}',
  integration: 'src/**/*.integration.{test,spec}.{ts,tsx}',
  e2e: 'src/**/*.e2e.{test,spec}.{ts,tsx}',
  performance: 'src/**/*.performance.{test,spec}.{ts,tsx}',
  accessibility: 'src/**/*.a11y.{test,spec}.{ts,tsx}',
  visual: 'src/**/*.visual.{test,spec}.{ts,tsx}',
};

// Mock data configuration
export const mockDataConfig = {
  users: {
    count: 100,
    roles: ['citizen', 'admin', 'expert', 'moderator'],
    verificationStatuses: ['verified', 'pending', 'unverified'],
  },
  bills: {
    count: 500,
    statuses: ['introduced', 'committee', 'floor', 'passed', 'failed'],
    categories: ['healthcare', 'education', 'environment', 'economy', 'security'],
  },
  comments: {
    count: 1000,
    maxDepth: 5,
    votingEnabled: true,
  },
};

// Test utilities configuration
export const testUtilsConfig = {
  renderOptions: {
    wrapper: 'TestProviders',
    queries: 'extended',
  },
  mockOptions: {
    timers: 'fake',
    fetch: 'mock',
    websocket: 'mock',
  },
  debugOptions: {
    verbose: false,
    logLevel: 'error',
    screenshots: false,
  },
};

export default {
  coverageThresholds,
  performanceThresholds,
  accessibilityConfig,
  visualRegressionConfig,
  e2eConfig,
  integrationConfig,
  unitTestConfig,
  testPatterns,
  mockDataConfig,
  testUtilsConfig,
};