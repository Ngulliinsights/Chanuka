import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    
    // Test configuration
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Test file patterns - ONLY .test.{ts,tsx} files for Vitest
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.{ts,tsx}', // Exclude Playwright spec files
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@server': path.resolve(__dirname),
      '@chanuka/shared': path.resolve(__dirname, '../shared'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@tests': path.resolve(__dirname, '../tests'),
    },
  },
});
