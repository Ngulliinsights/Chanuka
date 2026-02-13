/**
 * Vitest Configuration for Integration Tests
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, './setup/vitest-setup.ts')],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000,
    
    include: [
      'tests/**/*.integration.test.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/integration',
      include: [
        'server/**/*.{ts,tsx}',
        'shared/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/tests/**',
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
      '@': resolve(__dirname, '../../'),
      '@server': resolve(__dirname, '../../server'),
      '@shared': resolve(__dirname, '../../shared'),
      '@tests': resolve(__dirname, '../'),
    },
  },
});
