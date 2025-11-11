import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vitest Integration Testing Configuration
 * Specialized configuration for integration tests with real API interactions
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup-integration.ts'],
    css: true,
    
    /* Integration test specific settings */
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 10000,
    
    /* Test file patterns */
    include: ['**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    
    /* Environment options for integration tests */
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
      },
    },
    
    /* Coverage configuration for integration tests */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    /* Reporters for integration tests */
    reporter: [
      'verbose',
      'json',
      ['html', { outputFile: './test-results/integration-report.html' }],
    ],
    
    /* Retry configuration */
    retry: process.env.CI ? 2 : 0,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@chanuka/shared': resolve(__dirname, '../shared'),
    },
  },
});