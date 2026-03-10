/**
 * Vitest Configuration for Bills Feature Tests
 * 
 * Comprehensive test configuration for unit, integration, and e2e tests.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test patterns
    include: [
      '**/__tests__/**/*.test.ts',
      '**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ],

    // Global setup and teardown
    globalSetup: './test-setup.ts',
    
    // Test timeout
    testTimeout: 10000, // 10 seconds
    hookTimeout: 5000,  // 5 seconds

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'infrastructure/**/*.ts',
        'application/**/*.ts',
        '!**/__tests__/**',
        '!**/*.test.ts',
        '!**/*.d.ts',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Specific thresholds for critical files
        './infrastructure/data-sources/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './application/bill-service.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },

    // Reporters
    reporter: [
      'verbose',
    ],

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Retry configuration
    retry: 2,
    
    // Watch mode
    watch: false,
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Setup files
    setupFiles: [
      './test-setup-each.ts',
    ],
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, '../../../..'),
      '@shared': path.resolve(__dirname, '../../../../../shared'),
      '@client': path.resolve(__dirname, '../../../../../client/src'),
    },
  },

  // Define configuration
  define: {
    'import.meta.vitest': undefined,
  },
});