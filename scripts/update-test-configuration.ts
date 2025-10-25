#!/usr/bin/env tsx

/**
 * Test Configuration Update Script
 * 
 * Updates all test configurations to work with the current project structure
 */

import * as fs from 'fs';
import * as path from 'path';

class TestConfigurationUpdater {
  async updateAllConfigurations(): Promise<void> {
    console.log('🔧 Updating test configurations...\n');

    await this.updateVitestConfig();
    await this.updatePackageJsonScripts();
    await this.updateTsConfig();
    await this.createTestSetupFiles();
    await this.updateJestConfig();

    console.log('\n✅ Test configuration update complete!');
  }

  private async updateVitestConfig(): Promise<void> {
    console.log('📝 Updating vitest.config.ts...');

    const vitestConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      'drizzle',
      'logs',
      'tmp',
      'temp'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'dist/',
        'build/',
        'coverage/',
        'drizzle/',
        'migration/',
        'scripts/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@client': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@shared/core': path.resolve(__dirname, './shared/core/src'),
      '@shared/types': path.resolve(__dirname, './shared/types'),
      '@shared/schema': path.resolve(__dirname, './shared/schema'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});`;

    fs.writeFileSync('vitest.config.ts', vitestConfig);
    console.log('   ✅ Updated vitest.config.ts');
  }

  private async updatePackageJsonScripts(): Promise<void> {
    console.log('📦 Updating package.json test scripts...');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      
      // Update test scripts
      packageJson.scripts = {
        ...packageJson.scripts,
        "test": "vitest",
        "test:run": "vitest run",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest run --coverage",
        "test:watch": "vitest --watch",
        "test:client": "vitest run client/",
        "test:server": "vitest run server/",
        "test:shared": "vitest run shared/",
        "test:integration": "vitest run --config vitest.integration.config.ts",
        "test:e2e": "playwright test",
        "test:fix-all": "npm run fix-tests && npm run test:run",
        "test:debug": "vitest --inspect-brk --no-coverage",
        "verify-structure": "tsx scripts/verify-and-fix-project-structure.ts",
        "fix-tests": "tsx scripts/fix-failing-tests.ts",
        "update-test-config": "tsx scripts/update-test-configuration.ts"
      };

      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      console.log('   ✅ Updated package.json scripts');
    } catch (error) {
      console.error('   ❌ Failed to update package.json:', error);
    }
  }

  private async updateTsConfig(): Promise<void> {
    console.log('📝 Updating tsconfig.json for tests...');

    try {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
      
      // Ensure proper path mapping for tests
      tsConfig.compilerOptions = {
        ...tsConfig.compilerOptions,
        types: ["vitest/globals", "@testing-library/jest-dom", "node"],
        paths: {
          ...tsConfig.compilerOptions.paths,
          "@/*": ["./client/src/*"],
          "@client/*": ["./client/src/*"],
          "@server/*": ["./server/*"],
          "@shared/*": ["./shared/*"],
          "@shared/core/*": ["./shared/core/src/*"],
          "@shared/types": ["./shared/types"],
          "@shared/schema": ["./shared/schema"]
        }
      };

      // Include test files
      tsConfig.include = [
        ...new Set([
          ...(tsConfig.include || []),
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.spec.ts",
          "**/*.spec.tsx",
          "src/setupTests.ts",
          "vitest.config.ts"
        ])
      ];

      fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
      console.log('   ✅ Updated tsconfig.json');
    } catch (error) {
      console.error('   ❌ Failed to update tsconfig.json:', error);
    }
  }

  private async createTestSetupFiles(): Promise<void> {
    console.log('🛠️ Creating/updating test setup files...');

    // Update main setup file
    const setupTests = `/**
 * Global Test Setup
 * 
 * This file is automatically loaded before running tests.
 * It sets up the testing environment and global configurations.
 */

import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test setup
beforeEach(() => {
  // Reset any global state before each test
  vi.clearAllTimers();
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })),
});

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    VITE_API_URL: 'http://localhost:3001',
    VITE_WS_URL: 'ws://localhost:3001',
  }
}));

// Global test utilities
export const createMockUser = () => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'citizen' as const,
  verification_status: 'verified' as const,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const createMockBill = () => ({
  id: 1,
  title: 'Test Bill',
  description: 'A test bill for testing purposes',
  status: 'introduced' as const,
  bill_number: 'TB-001',
  category: 'test',
  view_count: 0,
  share_count: 0,
  comment_count: 0,
  engagement_score: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Mock API responses
export const mockApiResponse = <T>(data: T) => ({
  data,
  success: true,
  message: 'Success',
});

export const mockApiError = (message: string) => ({
  data: null,
  success: false,
  error: message,
});

// Test helpers for async operations
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));`;

    fs.writeFileSync('src/setupTests.ts', setupTests);
    console.log('   ✅ Updated src/setupTests.ts');

    // Create client-specific setup
    if (!fs.existsSync('client/src/setupTests.ts')) {
      fs.writeFileSync('client/src/setupTests.ts', `// Client-specific test setup
import '../../../src/setupTests';

// Additional client-specific mocks and setup
`);
      console.log('   ✅ Created client/src/setupTests.ts');
    }
  }

  private async updateJestConfig(): Promise<void> {
    console.log('🗑️ Removing old Jest configuration...');

    // Remove Jest config files if they exist
    const jestFiles = [
      'jest.config.js',
      'jest.config.ts',
      'jest.backend.config.js',
      'jest.frontend.config.js'
    ];

    for (const file of jestFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`   🗑️ Removed ${file}`);
      }
    }

    // Create integration test config
    const integrationConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: [
      '**/integration/**/*.{test,spec}.{ts,tsx}',
      '**/*.integration.{test,spec}.{ts,tsx}'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@client': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@shared/core': path.resolve(__dirname, './shared/core/src'),
      '@shared/types': path.resolve(__dirname, './shared/types'),
      '@shared/schema': path.resolve(__dirname, './shared/schema'),
    },
  },
});`;

    fs.writeFileSync('vitest.integration.config.ts', integrationConfig);
    console.log('   ✅ Created vitest.integration.config.ts');
  }
}

// Main execution
async function main(): Promise<void> {
  const updater = new TestConfigurationUpdater();
  await updater.updateAllConfigurations();
}

// Run if this is the main module
main().catch(console.error);

export { TestConfigurationUpdater };