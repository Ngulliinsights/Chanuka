import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vitest Performance Testing Configuration
 * Specialized configuration for performance and Core Web Vitals testing
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup-performance.ts'],
    css: true,
    
    /* Performance test specific settings */
    testTimeout: 60000, // Longer timeout for performance tests
    hookTimeout: 15000,
    
    /* Test file patterns */
    include: ['**/*.performance.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    
    /* Environment options for performance tests */
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
        pretendToBeVisual: true,
      },
    },
    
    /* Performance test specific configuration */
    pool: 'forks', // Use forks for better isolation in performance tests
    poolOptions: {
      forks: {
        singleFork: true, // Single fork for consistent performance measurements
      },
    },
    
    /* Reporters for performance tests */
    reporter: [
      'verbose',
      'json',
      ['html', { outputFile: './test-results/performance-report.html' }],
    ],
    
    /* No retries for performance tests to get consistent measurements */
    retry: 0,
    
    /* Benchmark configuration */
    benchmark: {
      include: ['**/*.bench.{ts,tsx}'],
      exclude: ['**/node_modules/**'],
      reporters: ['verbose', 'json'],
      outputFile: './test-results/benchmark-results.json',
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@chanuka/shared': resolve(__dirname, '../shared'),
    },
  },
});