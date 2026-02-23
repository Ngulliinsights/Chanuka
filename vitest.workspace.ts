import { defineWorkspace } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

/**
 * UNIFIED VITEST WORKSPACE CONFIGURATION
 *
 * This is the SINGLE SOURCE OF TRUTH for all test configuration across the monorepo.
 * All projects use consistent setup, environments, and conventions.
 *
 * Key Principles:
 * - One workspace, multiple projects (7 projects)
 * - Global utilities auto-injected via vitest.setup.ts
 * - Standardized naming conventions (.test.ts, .integration.test.ts, .e2e.test.ts)
 * - Phase 1 test infrastructure in /tests directory
 * - Eliminated duplicate and redundant configurations
 *
 * Entry Point Flow:
 * vitest.workspace.ts (this file)
 *   → Each project references vitest.setup.ts
 *     → tests/setup/vitest.ts (global utilities - auto-injected)
 *     → tests/setup/test-environment.ts (mocks)
 *     → tests/validation/ (validators - optional)
 */

export default defineWorkspace([
  // ============================================================================
  // CLIENT UNIT TESTS
  // ============================================================================
  {
    name: 'client-unit',
    extends: './client/vite.config.ts',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/client.ts'],
      css: true,
      testTimeout: 10000,
      hookTimeout: 5000,

      // Only includes standard unit tests
      include: [
        'client/src/**/*.test.{ts,tsx}',
        'client/src/**/*.spec.{ts,tsx}',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**/*.test.{ts,tsx}', // Exclude integration tests in __tests__
        '**/*.integration.test.{ts,tsx}',
        '**/*.e2e.test.{ts,tsx}',
        '**/*.performance.test.{ts,tsx}',
        '**/*.a11y.test.{ts,tsx}',
      ],

      environmentOptions: {
        jsdom: {
          resources: 'usable',
          url: 'http://localhost:3000',
        },
      },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage/client/unit',
        include: ['client/src/**/*.{ts,tsx}'],
        exclude: [
          'client/node_modules/**',
          'client/dist/**',
          'client/src/**/*.d.ts',
          'client/src/test-utils/**',
          'client/src/**/*.stories.{ts,tsx}',
          'client/src/__tests__/**',
        ],
        all: true,
        skipFull: false,
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 2 : 0,
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
          isolate: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './client/src'),
        '@client': resolve(__dirname, './client/src'),
        '@shared': resolve(__dirname, './shared'),
        '@workspace': resolve(__dirname, './shared'),
        '@workspace/types': resolve(__dirname, './shared/types'),
        '@workspace/core': resolve(__dirname, './shared/core'),
        '@workspace/validation': resolve(__dirname, './shared/validation'),
        '@workspace/constants': resolve(__dirname, './shared/constants'),
        '@core': resolve(__dirname, './client/src/core'),
        '@lib': resolve(__dirname, './client/src/lib'),
        '@features': resolve(__dirname, './client/src/features'),
        '@app': resolve(__dirname, './client/src/app'),
        '@hooks': resolve(__dirname, './client/src/lib/hooks'),
        '@utils': resolve(__dirname, './client/src/lib/utils'),
      },
    },
  },

  // ============================================================================
  // CLIENT INTEGRATION TESTS
  // ============================================================================
  {
    name: 'client-integration',
    extends: './client/vite.config.ts',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/client.ts'],
      css: true,
      testTimeout: 30000, // Longer for integration tests
      hookTimeout: 10000,

      // Integration tests in __tests__ directories and .integration files
      include: [
        'client/src/**/__tests__/**/*.test.{ts,tsx}',
        'client/src/**/__tests__/**/*.spec.{ts,tsx}',
        'client/src/**/*.integration.test.{ts,tsx}',
      ],
      exclude: ['**/node_modules/**', '**/dist/**'],

      environmentOptions: {
        jsdom: {
          resources: 'usable',
          url: 'http://localhost:3000',
        },
      },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage/client/integration',
        include: ['client/src/**/*.{ts,tsx}'],
        exclude: [
          'client/node_modules/**',
          'client/dist/**',
          'client/src/**/*.d.ts',
          'client/src/test-utils/**',
        ],
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 2 : 0,
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
          isolate: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './client/src'),
        '@client': resolve(__dirname, './client/src'),
        '@shared': resolve(__dirname, './shared'),
        '@workspace': resolve(__dirname, './shared'),
        '@workspace/types': resolve(__dirname, './shared/types'),
        '@workspace/core': resolve(__dirname, './shared/core'),
        '@workspace/validation': resolve(__dirname, './shared/validation'),
        '@workspace/constants': resolve(__dirname, './shared/constants'),
        '@core': resolve(__dirname, './client/src/core'),
        '@lib': resolve(__dirname, './client/src/lib'),
        '@features': resolve(__dirname, './client/src/features'),
        '@app': resolve(__dirname, './client/src/app'),
        '@hooks': resolve(__dirname, './client/src/lib/hooks'),
        '@utils': resolve(__dirname, './client/src/lib/utils'),
      },
    },
  },

  // ============================================================================
  // CLIENT ACCESSIBILITY TESTS (migrated from Jest)
  // ============================================================================
  {
    name: 'client-a11y',
    extends: './client/vite.config.ts',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/client.ts'],
      css: true,
      testTimeout: 15000,
      hookTimeout: 5000,

      // Only a11y tests
      include: ['client/src/**/*.a11y.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],

      environmentOptions: {
        jsdom: {
          resources: 'usable',
          url: 'http://localhost:3000',
        },
      },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage/client/a11y',
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 1 : 0,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './client/src'),
        '@client': resolve(__dirname, './client/src'),
        '@shared': resolve(__dirname, './shared'),
        '@workspace': resolve(__dirname, './shared'),
        '@workspace/types': resolve(__dirname, './shared/types'),
        '@workspace/core': resolve(__dirname, './shared/core'),
        '@workspace/validation': resolve(__dirname, './shared/validation'),
        '@workspace/constants': resolve(__dirname, './shared/constants'),
        '@core': resolve(__dirname, './client/src/core'),
        '@lib': resolve(__dirname, './client/src/lib'),
        '@features': resolve(__dirname, './client/src/features'),
        '@app': resolve(__dirname, './client/src/app'),
        '@hooks': resolve(__dirname, './client/src/lib/hooks'),
        '@utils': resolve(__dirname, './client/src/lib/utils'),
      },
    },
  },

  // ============================================================================
  // SERVER UNIT TESTS
  // ============================================================================
  {
    name: 'server-unit',
    extends: './server/vite.config.ts',
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/server.ts'],
      testTimeout: 10000,
      hookTimeout: 5000,

      // Standard unit tests only
      include: [
        'server/**/*.test.{ts,tsx}',
        'server/**/*.spec.{ts,tsx}',
      ],
      exclude: [
        'server/node_modules/**',
        'server/dist/**',
        'server/**/__tests__/**/*.test.{ts,tsx}', // Exclude integration
        'server/**/*.integration.test.{ts,tsx}',
        'server/**/*.e2e.test.{ts,tsx}',
      ],

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage/server/unit',
        include: ['server/**/*.{ts,tsx}'],
        exclude: [
          'server/node_modules/**',
          'server/dist/**',
          'server/**/*.d.ts',
          'server/**/__tests__/**',
          'server/tests/**',
        ],
        all: true,
        skipFull: false,
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 2 : 0,
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
          isolate: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './server/src'),
        '@shared': resolve(__dirname, './shared'),
      },
    },
  },

  // ============================================================================
  // SERVER INTEGRATION TESTS
  // ============================================================================
  {
    name: 'server-integration',
    extends: './server/vite.config.ts',
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/server.ts'],
      testTimeout: 30000, // Longer for DB operations
      hookTimeout: 10000,

      // Integration tests in __tests__ and .integration files
      include: [
        'server/**/__tests__/**/*.test.{ts,tsx}',
        'server/**/__tests__/**/*.spec.{ts,tsx}',
        'server/**/*.integration.test.{ts,tsx}',
      ],
      exclude: ['server/node_modules/**', 'server/dist/**'],

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage/server/integration',
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 2 : 0,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './server/src'),
        '@shared': resolve(__dirname, './shared'),
      },
    },
  },

  // ============================================================================
  // SHARED UTILITIES TESTS
  // ============================================================================
  {
    name: 'shared',
    extends: './shared/vite.config.ts',
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./vitest.setup.ts', './tests/setup/modules/shared.ts'],
      testTimeout: 10000,
      hookTimeout: 5000,

      include: [
        'shared/**/*.test.{ts,tsx}',
        'shared/**/*.spec.{ts,tsx}',
      ],
      exclude: [
        'shared/node_modules/**',
        'shared/dist/**',
        'shared/**/__tests__/**',
      ],

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage/shared',
        include: ['shared/**/*.{ts,tsx}'],
        exclude: [
          'shared/node_modules/**',
          'shared/dist/**',
          'shared/**/*.d.ts',
        ],
        all: true,
      },

      reporters: ['verbose'],
      retry: process.env.CI ? 2 : 0,
      pool: 'threads',
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, './shared'),
      },
    },
  },

  // ============================================================================
  // END-TO-END TESTS (Playwright)
  // ============================================================================
  {
    name: 'e2e',
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./vitest.setup.ts', './tests/setup/index.ts'],
      testTimeout: 60000, // E2E can take longer
      hookTimeout: 30000,

      include: ['tests/e2e/**/*.spec.{ts,tsx}'],
      exclude: ['**/node_modules/**'],

      reporters: ['verbose'],
      // E2E tests don't run in parallel by default
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
    },
  },
])
