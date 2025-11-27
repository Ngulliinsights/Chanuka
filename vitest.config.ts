import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Root Vitest Configuration
 * Handles unit tests across all modules with proper path aliases
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    
    // Test configuration
    testTimeout: 10000,
    hookTimeout: 5000,
    
    // Test file patterns - ONLY .test.{ts,tsx} files for Vitest
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.{ts,tsx}', // Exclude Playwright spec files
      '**/e2e/**',
      '**/integration/**',
    ],
    
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    
    reporters: ['verbose'],
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@client': resolve(__dirname, './client/src'),
      '@client/*': resolve(__dirname, './client/src/*'),
      '@server': resolve(__dirname, './server'),
      '@server/*': resolve(__dirname, './server/*'),
      '@shared': resolve(__dirname, './shared'),
      '@shared/*': resolve(__dirname, './shared/*'),
      '@shared/core': resolve(__dirname, './shared/core'),
      '@shared/core/*': resolve(__dirname, './shared/core/*'),
      '@shared/database': resolve(__dirname, './shared/database'),
      '@shared/database/*': resolve(__dirname, './shared/database/*'),
      '@shared/schema': resolve(__dirname, './shared/schema'),
      '@shared/schema/*': resolve(__dirname, './shared/schema/*'),
      '@shared/utils': resolve(__dirname, './shared/utils'),
      '@shared/utils/*': resolve(__dirname, './shared/utils/*'),
      '@chanuka/shared': resolve(__dirname, './shared'),
      '@tests': resolve(__dirname, './tests'),
      '@tests/*': resolve(__dirname, './tests/*'),
    },
  },
});