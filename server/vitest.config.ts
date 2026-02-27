/**
 * Vitest Configuration for Server Tests
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'server',
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 5000,
    
    include: [
      'server/**/__tests__/**/*.test.{ts,tsx}',
      'server/**/*.test.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/server',
      include: [
        'server/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/tests/**',
      ],
    },

    reporters: ['verbose'],
    retry: 0,
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
      '@': resolve(__dirname, '../'),
      '@server': resolve(__dirname, './'),
      '@shared': resolve(__dirname, '../shared'),
      '@client': resolve(__dirname, '../client/src'),
    },
  },
});
